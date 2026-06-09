import cron from 'node-cron'
import User from '../models/User.js'
import { syncGmailTransactions } from './gmailService.js'

const startCronJobs = () => {
  // runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running scheduled Gmail sync...')

    try {
      const users = await User.find({
        googleRefreshToken: { $exists: true, $ne: null }
      })

      for (const user of users) {
        await syncGmailTransactions(user)
        console.log(`Synced transactions for ${user.email}`)
      }
    } catch (error) {
      console.error('Cron sync failed:', error.message)
    }
  })

  console.log('Cron jobs started')
}

export default startCronJobs