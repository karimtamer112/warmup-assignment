const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    function toSeconds(timeStr) {
        let parts = timeStr.trim().split(" ");
        let time = parts[0];
        let period = parts[1];

        let [h, m, s] = time.split(":").map(Number);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    if (end < start) {
        end += 24 * 3600;
    }

    let diff = end - start;

    let hours = Math.floor(diff / 3600);
    let minutes = Math.floor((diff % 3600) / 60);
    let seconds = diff % 60;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function toSeconds(timeStr) {
        let parts = timeStr.trim().split(" ");
        let time = parts[0];
        let period = parts[1];

        let [h, m, s] = time.split(":").map(Number);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    if (end < start) {
        end += 24 * 3600;
    }

    const deliveryStart = 8 * 3600;
    const deliveryEnd = 22 * 3600;

    let idle = 0;

    if (start < deliveryStart) {
        idle += Math.min(end, deliveryStart) - start;
    }

    if (end > deliveryEnd) {
        idle += end - Math.max(start, deliveryEnd);
    }

    let hours = Math.floor(idle / 3600);
    let minutes = Math.floor((idle % 3600) / 60);
    let seconds = idle % 60;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    function toTime(seconds) {
        let h = Math.floor(seconds / 3600);
        let m = Math.floor((seconds % 3600) / 60);
        let s = seconds % 60;

        m = m.toString().padStart(2, "0");
        s = s.toString().padStart(2, "0");

        return `${h}:${m}:${s}`;
    }

    let shiftSec = toSeconds(shiftDuration);
    let idleSec = toSeconds(idleTime);

    let activeSec = shiftSec - idleSec;

    return toTime(activeSec);
}


// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let parts = activeTime.split(":");
    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);

    //Eid 
    if (date >= "2025-04-10" && date <= "2025-04-30") {
        if (hours >= 6) {
            return true;
        } else {
            return false;
        }
    }

    //Normal
    if (hours > 8) {
        return true;
    }

    if (hours === 8 && minutes >= 24) {
        return true;
    }

    return false;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    const fs = require("fs");

    let fileData = fs.readFileSync(textFile, "utf8");
    let lines = fileData.trim().split("\n");

  
    for (let i = 1; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaValue = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaValue,
        hasBonus: false
    };

    let line =
        `${newRecord.driverID},${newRecord.driverName},${newRecord.date},${newRecord.startTime},${newRecord.endTime},${newRecord.shiftDuration},${newRecord.idleTime},${newRecord.activeTime},${newRecord.metQuota},${newRecord.hasBonus}`;

    fs.appendFileSync(textFile, "\n" + line);

    return newRecord;
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

const fs = require("fs");

let data = fs.readFileSync(textFile, "utf8");
let lines = data.trim().split("\n");

for (let i = 1; i < lines.length; i++) {
let parts = lines[i].split(",");

if (parts[0] === driverID && parts[2] === date) {
parts[9] = newValue;
lines[i] = parts.join(",");
}
}

fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

const fs = require("fs");

let data = fs.readFileSync(textFile,"utf8");
let lines = data.trim().split("\n");
let count = 0;
let found = false;

for (let i = 1; i < lines.length; i++) {

let parts = lines[i].split(",");
let id = parts[0];
let date = parts[2];
let bonus = parts[9];
let fileMonth = date.split("-")[1];

if (id === driverID) {
found = true;

if ((fileMonth === month || fileMonth === month.padStart(2,"0")) && bonus === "true") {
count++;
}
}
}
if (!found) {
return -1;
}
return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

const fs = require("fs");

let data = fs.readFileSync(textFile,"utf8");
let lines = data.trim().split("\n");

let totalSeconds = 0;

for (let i = 1; i < lines.length; i++) {

let parts = lines[i].split(",");

let id = parts[0];
let date = parts[2];
let activeTime = parts[7];

let fileMonth = Number(date.split("-")[1]);

if (id === driverID && fileMonth === month) {

let timeParts = activeTime.split(":");
let h = Number(timeParts[0]);
let m = Number(timeParts[1]);
let s = Number(timeParts[2]);

totalSeconds += h*3600 + m*60 + s;

}

}

let hours = Math.floor(totalSeconds/3600);
let minutes = Math.floor((totalSeconds%3600)/60);
let seconds = totalSeconds%60;

minutes = minutes.toString().padStart(2,"0");
seconds = seconds.toString().padStart(2,"0");

return `${hours}:${minutes}:${seconds}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
