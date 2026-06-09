import { google } from 'googleapis'
import { oauth2Client } from '../config/google.js'
import Transaction from '../models/Transaction.js'
import { categorizeTransaction, normalizeVendorName } from './transactionService.js'
import redis from '../config/redis.js'

const getGmailClient = (user) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  auth.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  })

  return google.gmail({ version: 'v1', auth })
}

const extractEmailBody = (payload) => {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
  }

  return ''
}

const parseTransactionFromEmail = (emailBody, subject) => {
  const text = emailBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const amountPatterns = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:paid|sent|debited|spent)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i
  ]

  let amount = null
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  if (!amount) return null

  const vendorPatterns = [
    /(?:paid to|sent to|payment to|transferred to)\s+([A-Za-z0-9\s&.'-]{2,40}?)(?:\s+(?:on|for|via|using|ref|upi|transaction)|\.|,|$)/i,
    /(?:at|@)\s+([A-Za-z0-9\s&.'-]{2,40}?)(?:\s+(?:on|for|via|using|ref|upi|transaction)|\.|,|$)/i
  ]

  let vendor = 'Unknown'
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern)
    if (match) {
      vendor = match[1].trim()
      break
    }
  }

  if (vendor === 'Unknown' && subject) {
    const subjectMatch = subject.match(/(?:paid to|payment to|sent to)\s+([A-Za-z0-9\s&.'-]{2,40})/i)
    if (subjectMatch) vendor = subjectMatch[1].trim()
  }

  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
  ]

  let date = new Date()
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const parsed = new Date(match[0])
      if (!isNaN(parsed)) {
        date = parsed
        break
      }
    }
  }

  const isCredit = /(?:credited|received|refund|cashback)/i.test(text)

  return {
    amount,
    vendor,
    date,
    type: isCredit ? 'credit' : 'debit'
  }
}

const syncGmailTransactions = async (user) => {
  const gmail = getGmailClient(user)

  const searchQuery = [
    'from:noreply@googlepay.com',
    'from:gpay@google.com',
    'subject:payment',
    'subject:transaction',
    'subject:debited',
    'subject:credited',
    'subject:UPI'
  ].join(' OR ')

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: searchQuery,
    maxResults: 50
  })

  const messages = listResponse.data.messages || []
  let savedCount = 0

  for (const message of messages) {
    const existing = await Transaction.findOne({ gmailMessageId: message.id })
    if (existing) continue

    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: message.id
    })

    const subject = fullMessage.data.payload.headers.find(
      h => h.name.toLowerCase() === 'subject'
    )?.value || ''

    const emailBody = extractEmailBody(fullMessage.data.payload)
    const parsed = parseTransactionFromEmail(emailBody, subject)

    if (!parsed) continue

    const normalizedVendor = normalizeVendorName(parsed.vendor)
    const category = await categorizeTransaction(parsed.vendor, subject)

    await Transaction.create({
      userId: user._id,
      amount: parsed.amount,
      vendor: parsed.vendor,
      normalizedVendor,
      category,
      type: parsed.type,
      date: parsed.date,
      description: subject,
      gmailMessageId: message.id
    })

    savedCount++
  }

  if (savedCount > 0) {
  const keys = await redis.keys(`*:${user._id}:*`)
  if (keys.length > 0) await redis.del(...keys)
  console.log(`Cache invalidated for user ${user.email}`)
}

  return savedCount
}

export { syncGmailTransactions }