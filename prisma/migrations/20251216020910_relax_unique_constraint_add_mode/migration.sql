/*
  Warnings:

  - A unique constraint covering the columns `[date,startTime,endTime,coachId,modeId]` on the table `DaySchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DaySchedule_date_startTime_endTime_coachId_key";

-- CreateIndex
CREATE UNIQUE INDEX "DaySchedule_date_startTime_endTime_coachId_modeId_key" ON "DaySchedule"("date", "startTime", "endTime", "coachId", "modeId");
