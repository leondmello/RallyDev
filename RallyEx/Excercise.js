function InitializeGrid(objectsData, gridID, pagerID, gridTitle) {
    $(gridID).jqGrid({
        data: objectsData,
        height: "auto",
        datatype: 'local',
        colNames: [(gridID === "#tblWrkStateGrid") ? 'Work object State' : 'Work object ID', 'Hours', 'Mins', 'Secs'],
        colModel: [
            { name: 'WorkID', index: 'WorkID', key: true, sorttype: (gridID === "#tblWrkStateGrid") ? "string" : "int", align: "center", resizable: false },
            { name: 'Hours', index: 'Hours', sorttype: "int", align: "right", resizable: false },
            { name: 'Mins', index: 'Mins', sortable: false, align: "right", resizable: false },
            { name: 'Secs', index: 'Secs', sortable: false, align: "right", resizable: false },
        ],
        rowNum: 10,
        pager: pagerID,
        sortname: 'WorkID',
        viewrecords: true,
        sortorder: 'asc',
        caption: gridTitle
    });
}

//Converts the milliseconds stored for a date value into a proper time format
function ConvertMilliToTime(dateValue) {
    var hours = Math.floor(dateValue / (60 * 60 * 1000)),
    mins = Math.floor((dateValue % (60 * 60 * 1000)) / (60 * 1000)),
    secs = (dateValue % (60 * 60 * 1000) % (60 * 1000)) / (1000);

    return { "hours": hours, "mins": mins, "secs": secs };
}

function SetFebMonthData(jsonData, dataCase, gridID, pagerID, gridTitle) {
    var record,
        startDate,
        endDate,
        febStartDate = new Date("2012-02-01T00:00:00.000Z"),
        febEndDate = new Date("2012-03-01T00:00:00.000Z"),
        dateDifference,
        minEndDate,
        maxStartDate,
        noOfWorkDays,
        workObjects = {},
        tempObject,
        splitTime,
        index = 0,
        timeZoneOffset,
        dataArray = new Array();

    if (dataCase === 1) {
        febStartDate = new Date("2012-02-01T09:00:00.000Z");
        febEndDate = new Date("2012-02-29T17:00:00.000Z");
    }

    //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
    timeZoneOffset = febStartDate.getTimezoneOffset();
    febStartDate = new Date(febStartDate.getTime() + (timeZoneOffset - 300) * 60000);
    febEndDate = new Date(febEndDate.getTime() + (timeZoneOffset - 300) * 60000);

    for (; index < jsonData.length; index++) {

        record = jsonData[index];

        //Just in case if the parsing code breaks, ignore the row and continue
        try {

            //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
            startDate = new Date(new Date(record["_ValidFrom"]).getTime() + (timeZoneOffset - 300) * 60000);
            endDate = new Date(new Date(record["_ValidTo"]).getTime() + (timeZoneOffset - 300) * 60000);

            switch (dataCase) {

                //Consider 24 hours in a day
                case 0:
                    //Check if the time stamps duration is including some part of february
                    if (!(endDate < febStartDate) && !(startDate > febEndDate)) {
                        dateDifference = Math.min(endDate, febEndDate) - Math.max(febStartDate, startDate);

                        //If the object does not exist, create one and set the time, else add on the time
                        if (typeof workObjects[record.ObjectID] === 'undefined') {
                            workObjects[record.ObjectID] = dateDifference;
                        }
                        else {
                            workObjects[record.ObjectID] += dateDifference;
                        }
                    }
                    break;

                    //Consider only working hours and days
                case 1:
                    //Check if the time stamps duration is including some part of february
                    if (!(endDate < febStartDate) && !(startDate > febEndDate)) {

                        //If end time stamp date is after feb, count time only till end of feb
                        //Else take one day less than the feb time stamp date, the remaining time is added at the end
                        if (endDate > febEndDate)
                            minEndDate = new Date(febEndDate);
                        else {
                            minEndDate = new Date(endDate);
                            minEndDate.setDate(endDate.getDate() - 1);
                        }

                        //If start time stamp date is before feb, count time only from start of feb
                        //Else take one day more than the feb time stamp date, the remaining time is added at the end
                        if (startDate < febStartDate)
                            maxStartDate = new Date(febStartDate);
                        else {
                            maxStartDate = new Date(startDate);
                            maxStartDate.setDate(startDate.getDate() + 1);
                        }

                        noOfWorkDays = 0;

                        //Counts the number of working days in the time interval
                        while (minEndDate > maxStartDate) {
                            if (maxStartDate.getDay() !== 0 && maxStartDate.getDay() !== 1) {
                                noOfWorkDays++
                            }

                            maxStartDate = new Date(maxStartDate.getTime() + 24 * 60 * 60 * 1000);
                        }

                        //Subtracts working days * 9 hours from the end time to get the time spent
                        dateDifference = minEndDate - new Date(minEndDate.getTime() - noOfWorkDays * 8 * 60 * 60 * 1000);

                        //Add the remaining time of one day at the end which we had trimmed at the beginning 
                        if (!(endDate > febEndDate)) {

                            minEndDate = (endDate.getDate() < 10) ? ("0" + endDate.getDate()) : endDate.getDate();
                            minEndDate = new Date("2012-02-" + minEndDate + "T17:00:00.000Z");

                            //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
                            minEndDate = new Date(minEndDate.getTime() + (timeZoneOffset - 300) * 60000);

                            //Check if the remaining time is past the working hour for that day and adjust the bound accordingly
                            if (endDate > minEndDate)
                                endDate = minEndDate;

                            //Subtract the end time from the start time of day to get work hours
                            minEndDate = (endDate.getDate() < 10) ? ("0" + endDate.getDate()) : endDate.getDate();
                            minEndDate = new Date('2012-02-' + minEndDate + 'T09:00:00.000Z');

                            //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
                            minEndDate = new Date(minEndDate.getTime() + (timeZoneOffset - 300) * 60000);

                            dateDifference += endDate - minEndDate;
                        }

                        //Add the remaining time of one day at the start which we had trimmed at the beginning 
                        if (!(startDate < febStartDate)) {

                            maxStartDate = (startDate.getDate() < 10) ? "0" + startDate.getDate() : startDate.getDate();
                            maxStartDate = new Date("2012-02-" + maxStartDate + "T09:00:00.000Z");

                            //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
                            maxStartDate = new Date(maxStartDate.getTime() + (timeZoneOffset - 300) * 60000);

                            //Check if the remaining time is past the beginning of working hours for that day and adjust the bound accordingly
                            if (maxStartDate > startDate)
                                startDate = maxStartDate;

                            //Subtract the start time from the end time of day to get work hours
                            maxStartDate = (startDate.getDate() < 10) ? ("0" + startDate.getDate()) : startDate.getDate();
                            maxStartDate = new Date('2012-02-' + maxStartDate + 'T17:00:00.000Z');

                            //Adjusting the time to eastern time since the Date object constructor takes the local system time zone
                            maxStartDate = new Date(maxStartDate.getTime() + (timeZoneOffset - 300) * 60000);

                            dateDifference += maxStartDate - startDate;
                        }

                        //Store work time for objects as per state else store as per object IDs
                        if (gridID === "#tblWrkStateGrid") {
                            //If the object does not exist, create one and set the time, else add on the time
                            if (typeof workObjects[record.ScheduleState] === 'undefined') {
                                workObjects[record.ScheduleState] = dateDifference;
                            }
                            else {
                                workObjects[record.ScheduleState] += dateDifference;
                            }
                        }
                        else {
                            if (typeof workObjects[record.ObjectID] === 'undefined') {
                                workObjects[record.ObjectID] = dateDifference;
                            }
                            else {
                                workObjects[record.ObjectID] += dateDifference;
                            }
                        }
                    }
                    break;
            }
        }
        catch (ex) {
        }
    }

    //Create an array of the work objects to display in a grid
    for (var workId in workObjects) {
        splitTime = ConvertMilliToTime(workObjects[workId]);
        tempObject = { "WorkID": workId, "Hours": splitTime.hours, "Mins": splitTime.mins, "Secs": splitTime.secs };
        dataArray.push(tempObject);
    }

    InitializeGrid(dataArray, gridID, pagerID, gridTitle);
}

function RenderGrids() {
    SetFebMonthData(workArray, 0, "#tblAllHrsGrid", "#divAllHrsPager", 'Time spent on work items irrespective of working hours');
    SetFebMonthData(workArray, 1, "#tblWrkHrsGrid", "#divWrkHrsPager", 'Time spent on work items considering only working hours');
    SetFebMonthData(workArray, 1, "#tblWrkStateGrid", "#divWrkStatePager", 'Time spent on work states considering only working hours');
}

RenderGrids();