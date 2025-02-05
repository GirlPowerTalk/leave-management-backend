import { CronJob } from 'cron';

const job = new CronJob('*/5 * * * * *', updateCasualLeave, null, true);

function updateCasualLeave() {
   try {
      console.log('Cron job started at:', new Date());
      return ''
   } catch (error) {
      console.log('Cron job failed')
      return ''
   }
}

// Start the job
export const jobStart = () => {
   // job.start();
   job.stop()
}
// job.start();