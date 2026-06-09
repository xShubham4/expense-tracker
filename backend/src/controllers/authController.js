import { oauth2Client, SCOPES } from '../config/google.js'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const googleLogin = (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  })
  res.json({ url: authUrl })
}

const googleCallback = async (req, res) => {
  const { code } = req.query

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const peopleApi = google.people({ version: 'v1', auth: oauth2Client })
    const { data } = await peopleApi.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos'
    })

    const name = data.names[0].displayName
    const email = data.emailAddresses[0].value
    const picture = data.photos[0].url

    let user = await User.findOne({ email })

    if (!user) {
      user = await User.create({
        name,
        email,
        picture,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token
      })
    } else {
      user.googleAccessToken = tokens.access_token
      if (tokens.refresh_token) {
        user.googleRefreshToken = tokens.refresh_token
      }
      await user.save()
    }

    const jwtToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.redirect(`http://localhost:5173/auth/callback?token=${jwtToken}`)

  } catch (error) {
    console.error('OAuth callback error:', error.message)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

export { googleLogin, googleCallback }