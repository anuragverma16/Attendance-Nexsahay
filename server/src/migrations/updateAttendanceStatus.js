/**
 * Migration to update all existing attendance records with correct attendanceStatus
 * based on their entry times
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexsahay_attendance');

const Attendance = mongoose.connection.collection('attendances');

// Helper function to determine status based on entry time
function determineAttendanceStatus(entryTime) {
  if (!entryTime) return null;

  const [hours, minutes] = entryTime.split(':').map(Number);
  const entryMinutes = hours * 60 + minutes;

  const cutoffLate = 10 * 60 + 15; // 10:15 AM = 615 minutes
  const cutoffHalfDay = 12 * 60; // 12:00 PM = 720 minutes

  if (entryMinutes <= cutoffLate) {
    return 'Present';
  } else if (entryMinutes < cutoffHalfDay) {
    return 'Late';
  } else {
    return 'Half Day';
  }
}

async function migrateRecords() {
  try {
    console.log('Starting migration...');

    // Get all attendance records
    const records = await Attendance.find({}).toArray();
    console.log(`Found ${records.length} records to update`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      // If record already has attendanceStatus, skip it
      if (record.attendanceStatus) {
        skipped++;
        continue;
      }

      // If record has entryTime, calculate the status
      if (record.entryTime) {
        const status = determineAttendanceStatus(record.entryTime);

        if (status) {
          await Attendance.updateOne(
            { _id: record._id },
            {
              $set: {
                attendanceStatus: status,
                punchedOut: !!record.exitTime,
              }
            }
          );
          updated++;

          if (updated % 100 === 0) {
            console.log(`Updated ${updated} records...`);
          }
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated} records`);
    console.log(`   Skipped: ${skipped} records`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateRecords();
