-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COACH';

-- AlterTable
ALTER TABLE "DaySchedule" ADD COLUMN     "coachId" INTEGER;

-- AddForeignKey
ALTER TABLE "DaySchedule" ADD CONSTRAINT "DaySchedule_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
