/**
 * Copyright NetSuite, Inc. 2013 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Dec 2013     Randy Lorenzano
 * 
 */


SUBLIST = 'custpage_list';
HC_TBL_WIDTH = 900;
HC_PENDINGAPPROVAL = 1;
FLD_CHART = 'custpage_chart_content';

FLD_SL_ACTION = 'custpage_action';
FLD_SL_PERIOD_FROM = 'custpage_period_fr';
FLD_SL_NO_MOS = 'custpage_noofmonths';
SCRIPT_CS = 'customscript_rl_capacity_chart_cs';

SS_TO_REQ = 'customsearch_rl_sdg_request_ss';

REC_TOREQUEST = 'customrecord_rl_to_request';

FLD_REQ_EMPLOYEE = 'custrecord_rl_to_employee';
FLD_REQ_START = 'custrecord_rl_to_start';
FLD_REQ_END = 'custrecord_rl_to_end';
FLD_REQ_TYPE = 'custrecord_rl_to_type';
FLD_REQ_REASON = 'custrecord_rl_to_reason';
FLD_REQ_STATUS = 'custrecord_rl_to_status';
FLD_REQ_DAYS = 'custrecord_rl_to_days';
FLD_REQ_HOURS = 'custrecord_rl_to_hours';
FLD_REQ_STARTTIME = 'custrecord_rl_to_starttime';
FLD_REQ_ABBR = 'custrecord_rl_to_abbr';
FLD_REQ_HALF = 'custrecord_rl_to_halfday';

REC_TOTYPE = 'customrecord_rl_to_type';
FLD_TYPE_NAME = 'name';
FLD_TYPE_ABBR = 'custrecord_rl_abbr';
FLD_TYPE_DAYS = 'custrecord_rl_no_of_days';
FLD_TYPE_CHAR = 'custrecord_rl_char';
FLD_TYPE_FG = 'custrecord_rl_foreground';
FLD_TYPE_BG = 'custrecord_rl_background';

REC_HOLIDAYS = 'customrecord_rl_holidays';
FLD_HOL_DATE = 'custrecord_rl_hol_date';
FLD_HOL_NAME = 'name';
FLD_HOL_TYPE = 'custrecord_rl_hol_type';


/* 
 * Note: 
 *    Other Variables refer to SDGSchedulerHelper.js
 */


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {void} Any output is written via response object
 */

function CapacityChartSuitelet(request, response) {
    var nMos = request.getParameter(FLD_SL_NO_MOS);
    if (nMos == null || nMos == '') nMos = 1;
    var sDateFr = request.getParameter(FLD_SL_PERIOD_FROM);

    if (sDateFr == null || sDateFr == '')
        sDateFr = nlapiDateToString(new Date(), 'MM/DD/YYYY');

    var form = nlapiCreateForm(CAPACITY_CHART_TITLE, false);
    form.setScript(SCRIPT_CS);

    form.setTitle(CAPACITY_CHART_TITLE);
    form.addFieldGroup('myfilters', 'Date Range');

    var fldPeriodFr = form.addField(FLD_SL_PERIOD_FROM, 'date', 'From', null, 'myfilters');
    if (sDateFr)
        fldPeriodFr.setDefaultValue(sDateFr);

    var fldMonths = form.addField(FLD_SL_NO_MOS, 'integer', 'Months to Display', null, 'myfilters');
    fldMonths.setDisplaySize(5);
    if (nMos)
        fldMonths.setDefaultValue(nMos);

    form.addFieldGroup('myreport', 'Schedule');
    var fldHTML = form.addField(FLD_CHART, 'inlinehtml', CAPACITY_CHART_TITLE, null, 'myreport');

    fldHTML.setLayoutType('outside');

    var sContent = '';
    sContent += addStyles();

    var oType = new timeOffType();
    //if (bShowLegend)
    var dStartDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(sDateFr), 0), 'MM/DD/YYYY');
    var dEndDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(sDateFr), nMos), 'MM/DD/YYYY');

    if (DEBUG)
        sContent += '::: ' + dStartDate + ' - ' + dEndDate + ' :: ';

    sContent += oType.renderTable(dStartDate, dEndDate);

    if (DEPARTMENT != null) {
        sContent += renderChart(sDateFr, true); // 1==nMos);
        if (sDateFr) {
            for (var i = 2; i <= nMos; i++) {
                sDateFr = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(sDateFr), 1), 'MM/DD/YYYY');
                sContent += renderChart(sDateFr, true); // i==nMos);
            }
        }
    } else {
        sContent = 'Please setup Department under <b><i> Setup -> Company -> Setup Tasks -> General Preferences<i></b>, ';
        sContent += 'All employees from the selected department will be included in the Capacity Chart';
    }
    fldHTML.setDefaultValue(sContent);

    form.addSubmitButton('Submit');
    response.writePage(form);
}



function renderChart(sDateFr, bShowLegend) {
    var sContent = '';
    var sSpacer = '';

    var oType = new timeOffType();

    sContent += '<table class = "scheduler" style="cellspacing:0; cellpadding: 0; ">\n';
    for (var i = 0; i < 34; i++)
        sSpacer += "&nbsp;&nbsp;";
    sContent += '<tr><td class="tdbrdr tdbrdrtop sdghead tinytext">' + sSpacer + '</td>';

    for (var i = 0; i <= ((7 * 5) - 1) ; i++) {

        if (i == ((7 * 5) - 1))
            sContent += '<td class="textnolink tdbrdrtop tdbrdr tdbrdrright sdghead centerText" style="width:30px;">' + WEEKDAY[i % 7] + '</td></tr>';
        else
            sContent += '<td class="textnolink tdbrdrtop tdbrdr sdghead centerText" style="width:20px;">' + WEEKDAY[i % 7] + '</td>';

    }

    var d = new Date(); // date
    if (sDateFr != null)
        d = nlapiStringToDate(sDateFr);

    var MONTH = d.getMonth() * 1 + 1;

    var dStartDate = getStartDate(sDateFr);
    var theDate = nlapiStringToDate(sDateFr);
    monthDate = theDate.getDate();
    var dEndDate = rlAddDays(dStartDate, 34);

    if (DEBUG)
        sContent += '::: ' + dStartDate + ' - ' + dEndDate + ' :: ' + MONTH * 1;
    sContent += '<tr><td class="tdbrdr tdbrdrtop sdgsubhd sdghdbtm"> ' + MONTHS[MONTH - 1] + ' ' + d.getFullYear().toString() + '</td>';

    var dCurDate = dStartDate;
    for (var i = 0; i <= ((7 * 5) - 1) ; i++) {
        var theDate = nlapiStringToDate(dCurDate);
        monthDate = theDate.getDate();

        if (i == ((7 * 5) - 1))
            sContent += '<td class="textboldnolink tdbrdrtop tdbrdr sdgsubhd sdghdbtm tdbrdrright">' + monthDate + '</td></tr>';
        else
            sContent += '<td class="textboldnolink tdbrdrtop tdbrdr sdgsubhd sdghdbtm">' + monthDate + '</td>';

        dCurDate = rlAddDays(dCurDate, 1);
    }

    /* this is where it all happens */
    var arrEmp = getEmployees(DEPARTMENT);
    var arrEmpId = [];
    for (var j = 0; j < arrEmp.length; j++)
        arrEmpId.push(arrEmp[j].getId());

    /* the timeoff table*/

    var aReqTable = getTOTableByMonth(dStartDate, dEndDate);
    var aHolidayTable = getHolidays(dStartDate, dEndDate);

    if (DEBUG)
        nlapiLogExecution('debug', 'title', 'MONTH: ' + MONTH + ' dStartDate: ' + dStartDate + '   dEndDate: ' + dEndDate);

    var bg = '';
    for (var j = 0; j < arrEmp.length; j++) {
        var dCurDate = dStartDate;
        sContent += '<tr><td class="tdbrdr sdgname"><span class="sdgupper textboldnolink">' + arrEmp[j].getValue(FLD_LASTNAME).toUpperCase() + '</span>, <span class="sdgfname tinytext textnolink">' + arrEmp[j].getValue(FLD_FIRSTNAME) + '</span></td>';
        for (var i = 0; i <= ((7 * 5) - 1) ; i++) {

            bg = (i % 7 == 6 || i % 7 == 0) ? 'sdgweekend' : 'sdgweekday';

            if (rlIsHoliday(aHolidayTable, dCurDate)) {
                //bg = 'sdgholiday';
                sEmpDayStatus = oType.renderHoliday();
            } else
                sEmpDayStatus = oType.show(rlShowRequest(aReqTable, dCurDate, arrEmp[j].getId()));

            if (bg == 'sdgweekend')
                sEmpDayStatus = '&nbsp;';


            if (i == ((7 * 5) - 1))
                sContent += '<td class="tdbrdr tinytext tdbrdrright centerText ' + bg + '">' + sEmpDayStatus + '</td></tr>';
            else
                sContent += '<td class="tdbrdr tinytext centerText ' + bg + '">' + sEmpDayStatus + '</td>';

            dCurDate = rlAddDays(dCurDate, 1);
        }
    }

    sContent = sContent + '</table>\n<br />\n';
    return sContent;
}

function getStartDate(sDateFr) {
    d = nlapiStringToDate(sDateFr);
    var MONTH = d.getMonth() * 1 + 1;
    var n = d.getDate();
    var day = d.getDay(); // day
    var monthDate = (n - day);
    for (; monthDate > 1; monthDate -= 7);

    var dStartDate = MONTH + '/1/' + d.getFullYear().toString();

    if (monthDate < 1) {
        var dDate = nlapiStringToDate(MONTH + '/1/' + d.getFullYear().toString());
        dDate = nlapiAddDays(dDate, monthDate - 1);
        dStartDate = nlapiDateToString(dDate, 'MM/DD/YYYY');
    }
    return dStartDate;

}

function rlIsHoliday(aHoliday, dCurDate) {
    var bHoliday = false;

    if (aHoliday)
        for (i = 0; i < aHoliday.length; i++)
            if (dCurDate == aHoliday[i].date)
                bHoliday = true;

    return bHoliday;

}

function rlShowRequest(aReqTable, dCurDate, idEmployee) {

    if (aReqTable)
        for (i = 0; i < aReqTable.length; i++) {
            if (idEmployee == aReqTable[i].employee) {
                if (dCurDate == aReqTable[i].reqdate) {
                    return {
                        id: aReqTable[i].id,
                        reqtype: aReqTable[i].reqtype, //aReqTable[i].reqtype
                        ishalf: aReqTable[i].ishalf,
                        status: aReqTable[i].status
                    };
                }
            }
        }

    return '&nbsp;';
}



function timeOffType() {
    this.aTypes = this.getTypes();

}


timeOffType.prototype.getTypes = function () {
    var aExpression = []; //[new nlobjSearchFilter(FLD_ISINACTIVE, null, 'is', 'F')];

    var aCols = [
	              new nlobjSearchColumn(FLD_TYPE_NAME),
	              new nlobjSearchColumn(FLD_TYPE_ABBR),
	              new nlobjSearchColumn(FLD_TYPE_DAYS),
	              new nlobjSearchColumn(FLD_TYPE_CHAR),
	              new nlobjSearchColumn(FLD_TYPE_FG),
	              new nlobjSearchColumn(FLD_TYPE_BG)
    ];

    var aTimeOffs = nlapiSearchRecord(REC_TOTYPE, null, aExpression, aCols);
    return aTimeOffs;
};

timeOffType.prototype.getType = function (idType) {

    if (this.aTypes)
        for (var i = 0; i < this.aTypes.length; i++)
            if (this.aTypes[i].getId() == idType) {
                this.char = this.aTypes[i].getValue(FLD_TYPE_CHAR);
                this.color = this.aTypes[i].getValue(FLD_TYPE_FG);
                this.background = this.aTypes[i].getValue(FLD_TYPE_BG);
            };

};

timeOffType.prototype.show = function (oRequest) {

    this.char = '&nbsp;';
    this.color = '#00FFFF';//'#FF0000';
    this.background = CHART_BG_COLOR;

    this.getType(oRequest.reqtype);

    return this.renderChar(this.background, this.color, this.getChar(oRequest.ishalf), oRequest.status == HC_PENDINGAPPROVAL, oRequest.id);
};

timeOffType.prototype.renderChar = function (sBGColor, sColor, sChar, sShowBorder, idPTO) {
    var sBorder = sShowBorder ? ' border: 2px solid red' : '';
    var sCharValue = sChar;
    if (idPTO != null) {
        sURL = 'https://system.na1.netsuite.com/app/common/custom/custrecordentry.nl?rectype=22&id=' + idPTO;
        sCharValue = '<a href="' + sURL + '" border=0 target="_blank"  style="color:' + sColor + '; text-decoration:none;">' + sChar + '</a>';
    }
    return '<div class=\'box\' style="background:' + sBGColor + '; ' + sBorder + '"><div class=\'box-cont\'><div><span style="color:' + sColor + ';">' + sCharValue + '</span></div></div></div>';
};

timeOffType.prototype.renderHoliday = function () {

    return this.renderChar(HC_BG_HOLIDAY, HC_TC_HOLIDAY, 'H');
};

timeOffType.prototype.getChar = function (isHalf) {
    if (isHalf == 'T')
        return HC_CHAR_HALF;
    else
        return this.char;
};


timeOffType.prototype.getActiveTypes = function (dStartDate, dEndDate) {
    var aExpression = [
	                   new nlobjSearchFilter(FLD_REQ_START, null, 'onorafter', dStartDate),
	                   new nlobjSearchFilter(FLD_REQ_START, null, 'onorbefore', dEndDate),
	                   new nlobjSearchFilter(FLD_REQ_STATUS, null, 'is', 2),
	                   new nlobjSearchFilter(FLD_ISINACTIVE, null, 'is', 'F'),
	                   new nlobjSearchFilter(FLD_ISINACTIVE, FLD_REQ_EMPLOYEE, 'is', 'F')
    ]; // 1 = Pending; 2 = Approved; 3 = Rejected
    var aCols = [new nlobjSearchColumn(FLD_REQ_TYPE, null, 'group')];
    var aTOs = nlapiSearchRecord(REC_TOREQUEST, null, aExpression, aCols);
    var aActiveTypes = [];
    if (aTOs)
        for (var i = 0; i < aTOs.length; i++) {
            var oType = {
                id: aTOs[i].getValue(FLD_REQ_TYPE, null, 'group'),
                name: aTOs[i].getText(FLD_REQ_TYPE, null, 'group')
            };
            aActiveTypes.push(oType);
        }

    return aActiveTypes;
};

timeOffType.prototype.renderTable = function (dStartDate, dEndDate) {

    var sContent = '<tr><td colspan=8 style="vertical-align:middle; padding-bottom:5px; padding-top:5px;">Legend</td><td> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </td>';
    var aActiveTypes = this.getActiveTypes(dStartDate, dEndDate);
    var maxCol = 10;
    var nCount = 1;
    if (this.aTypes)
        for (var i = 0; i < aActiveTypes.length; i++) {
            if ((nCount % maxCol) == 0) {
                sContent += '</tr><tr><td colspan=9>&nbsp;</td>';
                nCount++;
            }
            sContent += '<td class="normalText">' + aActiveTypes[i].name + '</td><td>&nbsp;</td><td>' + this.show({ reqtype: aActiveTypes[i].id, ishalf: 'F' }) + '</td><td>&nbsp;</td>';
            nCount++;
        };
    sContent += ((nCount++ % maxCol) == 0) ? '</tr><tr><td colspan=9>&nbsp;</td>' : '';
    sContent += '<td class="normalText">Weekend</td><td>&nbsp;</td><td> ' + this.renderChar(HC_BG_WEEKEND, '', '&nbsp;') + '</td><td> &nbsp; </td>';
    sContent += ((nCount++ % maxCol) == 0) ? '</tr><tr><td colspan=9>&nbsp;</td>' : '';
    sContent += '<td class="normalText">Holiday</td><td>&nbsp;</td><td> ' + this.renderHoliday() + ' </td><td> &nbsp; </td>';
    sContent += ((nCount++ % maxCol) == 0) ? '</tr><tr><td colspan=9>&nbsp;</td>' : '';
    sContent += '<td class="normalText">Half Day</td><td>&nbsp;</td><td> ' + this.renderChar('', '#333', HC_CHAR_HALF) + ' </td></tr>';

    return '<table cellspacing=0 cellpadding=1 style="border: 1px solid #e5e5e5; padding:5px; margin:auto; ">' + sContent + '</table><br />';
};


function getTOTableByMonth(dStartDate, dEndDate) {
    var aReqTable = [];
    var aTO = getTimeOffByMonth(dStartDate, dEndDate);

    if (aTO)
        for (var i = 0; i < aTO.length; i++) {
            /* for (var i=0; i < aTO.length && i < 5; i++) { //jbucoy 5/16/15: added employee count limit */
            var oTO = aTO[i];

            var reqDate = oTO.getValue(FLD_REQ_START);
            var nDays = getReqDayCount(oTO.getValue(FLD_REQ_START), oTO.getValue(FLD_REQ_END));

            for (j = 1; j <= nDays; j++) {

                var oDayOff = {
                    id: oTO.getId(),
                    employee: oTO.getValue(FLD_REQ_EMPLOYEE),
                    reqdate: reqDate,
                    abbr: oTO.getValue(FLD_REQ_ABBR, REC_TOTYPE),
                    reqtype: oTO.getValue(FLD_REQ_TYPE),
                    ishalf: oTO.getValue(FLD_REQ_HALF),
                    starttime: oTO.getValue(FLD_REQ_STARTTIME),
                    status: oTO.getValue(FLD_REQ_STATUS),
                };
                reqDate = rlAddDays(reqDate, 1);
                aReqTable.push(oDayOff);
            }
        }
    return aReqTable;

}


function getTimeOffByMonth(dStartDate, dEndDate) {
    var aExpression = [
                       //[FLD_REQ_START, 'within', dStartDate, dEndDate], 'and',
                       [FLD_REQ_START, 'onorafter', dStartDate], 'AND',
	                   [FLD_REQ_START, 'onorbefore', dEndDate], 'AND',
	                   [FLD_REQ_STATUS, 'anyof', [HC_REQ_APPROVED, HC_REQ_PENDING]]
    ]; // 1 = Pending; 2 = Approved; 3 = Rejected

    var aTimeOffs = nlapiSearchRecord('customrecord_rl_to_request', SS_TO_REQ, aExpression);
    return aTimeOffs;
}


function getHolidays(dStartDate, dEndDate) {
    var aExpression = [
	                   new nlobjSearchFilter(FLD_HOL_DATE, null, 'within', dStartDate, dEndDate),
	                   new nlobjSearchFilter(FLD_ISINACTIVE, null, 'is', 'F')];

    var aCols = [
		         new nlobjSearchColumn(FLD_HOL_DATE),
		         new nlobjSearchColumn(FLD_HOL_NAME),
		         new nlobjSearchColumn(FLD_HOL_TYPE)
    ];
    var aDays = nlapiSearchRecord(REC_HOLIDAYS, null, aExpression, aCols);

    var aHolidays = [];
    if (aDays)
        for (var i = 0; i < aDays.length; i++) {
            aHolidays.push(
					{
					    "date": aDays[i].getValue(FLD_HOL_DATE),
					    "name": aDays[i].getValue(FLD_HOL_NAME)
					});
        }


    return aHolidays;
}

function getReqDayCount(dStartDate, dEndDate) {
    var reqDate = dStartDate;

    for (var nCount = 1; reqDate != dEndDate; nCount++)
        reqDate = rlAddDays(reqDate, 1);

    return nCount;

}


function addStyles() {
    var arrHtml = [];
    var sBorderColor = '#585858';
    arrHtml.push('<style type="text/css">');
    arrHtml.push('\n td.tdbrdr {');
    arrHtml.push('border-left:1px solid ' + sBorderColor + ';');
    arrHtml.push('border-bottom:1px solid ' + sBorderColor + ';');

    arrHtml.push('}');
    arrHtml.push('td.tdbrdrright {');
    arrHtml.push('border-right:1px solid ' + sBorderColor + ';');
    arrHtml.push('}');
    arrHtml.push('td.tdbrdrtop {');
    arrHtml.push('border-top:1px solid ' + sBorderColor + ';');
    arrHtml.push('}');
    arrHtml.push('td.sdghead {');
    arrHtml.push('background-color:#484848;');
    arrHtml.push('color:#fff;');
    arrHtml.push('padding:5px;');
    arrHtml.push('font-size:8px;');
    arrHtml.push('text-align:center;');
    arrHtml.push('}');
    arrHtml.push('td.sdgsubhd {');
    arrHtml.push('background-color:#505050;');
    arrHtml.push('color:#fff;');
    arrHtml.push('text-align:center;');
    arrHtml.push('}');

    arrHtml.push('td.sdgweekend {');
    arrHtml.push('background-color:#ccc;');
    arrHtml.push('}');

    arrHtml.push('td.sdgweekday {');	   //
    //arrHtml.push(    'display: inline-block;');
    arrHtml.push('width:28px;');
    arrHtml.push('text-align:center;');
    arrHtml.push('background-color:' + CHART_BG_COLOR + ';');
    arrHtml.push('}');

    arrHtml.push('td.sdgholiday {');
    arrHtml.push('background-color:#333300;');
    arrHtml.push('color:#33FF00;');
    arrHtml.push('text-align:center;');
    arrHtml.push('font-size:10;');
    arrHtml.push('}');

    arrHtml.push('td.sdghdbtm {');
    arrHtml.push('border-bottom:5px solid #101010;');
    arrHtml.push('}');

    arrHtml.push('td.sdgname {');
    arrHtml.push('width:300px;');
    arrHtml.push('}');

    arrHtml.push('td.centerText {');
    arrHtml.push('text-align:center;');
    arrHtml.push('}');

    arrHtml.push('td.sdgupper {');
    arrHtml.push('text-transform:uppercase;');
    arrHtml.push('}');
    arrHtml.push('td.tinytext { font-size: 8;}');
    arrHtml.push('td.normalText { font-size: 11;}');
    arrHtml.push('table.scheduler { border-spacing: 0; border-collapse: separate;}');

    arrHtml.push('.box{								');
    arrHtml.push('    position: relative;				');
    arrHtml.push('    margin: 0 auto;					');
    arrHtml.push('    width: 24px;					');
    arrHtml.push('    overflow: hidden;				');
    arrHtml.push('	-moz-box-shadow:    inset 0 0 4px #eeeeee; ');
    arrHtml.push(' 	-webkit-box-shadow: inset 0 0 4px #eeeeee; ');
    arrHtml.push('	box-shadow:         inset 0 0 4px #eeeeee; ');
    arrHtml.push('	border-radius: 5px; 						');
    /* background: #4679BD; */

    arrHtml.push('}											');
    arrHtml.push('.box:before{								');
    arrHtml.push('    content: "";							');
    arrHtml.push('    display: block;							');
    arrHtml.push('    padding-top: 100%;						');
    arrHtml.push('}											');
    arrHtml.push('.box-cont{									');
    arrHtml.push('    position:  absolute;top: 0;left: 0;		');
    arrHtml.push('    bottom: 0; right: 0; color: white;		');
    arrHtml.push('}											');
    arrHtml.push('.box-cont div {								');
    arrHtml.push('   display: table;							');
    arrHtml.push('   width: 100%;								');
    arrHtml.push('   height: 100%;							');
    arrHtml.push('}											');
    arrHtml.push('.box-cont span {							');
    arrHtml.push('    display: table-cell;					');
    arrHtml.push('    text-align: center;						');
    arrHtml.push('    vertical-align: middle;					');
    arrHtml.push('	font-size:9px;							');
    arrHtml.push('}    										');


    arrHtml.push('</style>');

    return arrHtml.join(' ');
}

