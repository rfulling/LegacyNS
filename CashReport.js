/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        25 Apr 2016     Virginia Bertolini

 *
 */

/**
 * This function is the main function being called in the suitelet.
 *
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


function main(request, response) {
    nlapiLogExecution('DEBUG', '*** START ***', request.getMethod());
    try {
        //assign a parameter to check on what stage of the suitelet you are already at and to create the corresponding form for that stage
        var form = displayResultsSuitelet(request);
        response.writePage(form);
    }
    catch (ex) {
        if (ex.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', ex.getCode() + ': ' + ex.getDetails());
            throw ex;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', ex.toString());
            throw nlapiCreateError('99999', ex.toString(), true);
        }
    }
}

/**
 * This function creates the initial form to be shown upon landing on the suitelet from the transaction.
 *
 * @param request
 * @returns nlobjForm
 */
function displayResultsSuitelet(request) {
    var stUser = nlapiGetUser();
    var _SEARCHFORM = nlapiCreateForm('Search Item(s)');
    var sl_items = _SEARCHFORM.addSubList('custpage_sl_items', 'list', 'Items');
    //create fields to reflect the same fields from the record where it is being fetched
    sl_items.addField('custpage_chkbox', 'checkbox', 'Choose').setDisplayType('hidden');
    sl_items.addField('custpage_label', 'Text', 'Item').setDisplayType('inline');
    //sl_items.addField('custpage_date', 'date', 'Date').setDisplayType('inline');
    sl_items.addField('custpage_qty', 'integer', 'Quantity').setDisplayType('hidden');
    //sl_items.addField('custpage_fromqtyonhand', 'integer', 'From Available').setDisplayType('inline');
    sl_items.addField('custpage_thisweek', 'currency', 'This Week: ').setDisplayType('inline');
    sl_items.addField('custpage_nextweek', 'currency', 'Next Week: ').setDisplayType('inline');
    sl_items.addField('custpage_weekafternext', 'currency', 'Week after Next: ').setDisplayType('inline');
    sl_items.addField('custpage_nexfourweeks', 'currency', 'Next 4 Weeks: ').setDisplayType('inline');
    sl_items.addField('custpage_nextmonth', 'currency', 'Next Month: ').setDisplayType('inline');

    var arrProjected = [{ 'accounttype': 'projectedCF' }];
    //start search
    var arrBank = getBank(request);
    var arrItems = getReceivables(request);
    var arrPayables = getPayables(request);
    var arrCashNet = getNetReceivable(request);
    var arrNet = getNet(request);

    //nlapiLogExecution('DEBUG', 'arrBank',JSON.stringify(arrBank));
    //nlapiLogExecution('DEBUG', 'arrItems',JSON.stringify(arrItems));
    //nlapiLogExecution('DEBUG', 'arrPayables',JSON.stringify(arrPayables));
    //nlapiLogExecution('DEBUG', 'arrCashNet',JSON.stringify(arrCashNet));
    //nlapiLogExecution('DEBUG', 'arrNet',JSON.stringify(arrNet));

    if (arrItems == null) {
        arrItems = [];
    }
    if (arrPayables == null) {
        arrPayables = [];
    }
    if (arrCashNet == null) {
        arrCashNet = [];
    }
    if (arrNet == null) {
        arrNet = [];
    }

    if (arrBank == null) {
        arrBank = [];
    }

    arrBank = arrBank.concat(arrItems);
    arrBank = arrBank.concat(arrPayables);
    arrBank = arrBank.concat(arrCashNet);
    arrBank = arrBank.concat(arrNet);


    nlapiLogExecution('DEBUG', 'arrBank', JSON.stringify(arrBank));
    nlapiLogExecution('DEBUG', 'arrItems', JSON.stringify(arrItems));
    nlapiLogExecution('DEBUG', 'arrPayables', JSON.stringify(arrPayables));
    nlapiLogExecution('DEBUG', 'arrCashNet', JSON.stringify(arrCashNet));
    nlapiLogExecution('DEBUG', 'arrNet', JSON.stringify(arrNet));


    if (arrBank) {
        //assign values to line fields
        for (var i = 0; i < arrBank.length; i++) {

            nlapiLogExecution('DEBUG', 'Item 2: ' + arrBank[i].getValue('formulatext', null, 'group'));

            sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'F');
            if (!isEmpty(arrBank[i].getText('accounttype', null, 'group'))) {
                sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getText('accounttype', null, 'group'));
            }
            else if (arrBank[i].getValue('formulatext', null, 'group') == 'Projected') {
                sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getValue('formulatext', null, 'group'));
            }
            else if (arrBank[i].getValue('formulatext', null, 'group') == 'Net Amount') {
                sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getValue('formulatext', null, 'group'));
            } else if ((arrBank[i].getValue('formulatext', null, 'group') == 'Cash')) {
                sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getValue('formulatext', null, 'group'));
            }
            //next get  alist of columns loop through the colums an of the result set and 
            //put them on the grid.
            var cols = arrBank[i].getAllColumns();
            for (var c = 0; c < cols.length; c++) {
                var colab = cols[c].label;
                switch (colab) {
                    case 'ww1': //label: PaymentAmountLeft
                        sl_items.setLineItemValue('custpage_thisweek', (i + 1), arrBank[i].getValue(cols[c]));
                        break;
                    case 'ww2':
                        sl_items.setLineItemValue('custpage_nextweek', (i + 1), arrBank[i].getValue(cols[c]));
                        break;
                    case 'ww3': //label: PaymentAmountLeft
                        sl_items.setLineItemValue('custpage_weekafternext', (i + 1), arrBank[i].getValue(cols[c]));
                        break;
                    case 'ww4':
                        sl_items.setLineItemValue('custpage_nexfourweeks', (i + 1), arrBank[i].getValue(cols[c]));
                        break;
                    case 'ww5':
                        sl_items.setLineItemValue('custpage_nextmonth', (i + 1), arrBank[i].getValue(cols[c]));
                        break;
                }
            }

        }
    }

    return _SEARCHFORM;

}

/**
 * This function gets the items based on the from/to date and location.
 *
 * @param request
 * @returns array
 */
function getReceivables(request) {
    var LOG_TITLE = 'getReceivables';

    var SEARCHFILTER_INVOICE = 'CustInvc';

    //var now = todaydate(); 

    var arrFilters = [];

    //arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [now, now]));
    var arrColumns = [];

    arrColumns[0] = new nlobjSearchColumn('accounttype', null, 'group');
    //arrColumns[0].setFormula("{Net Amount} = 'Net Amount'");
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula('CASE WHEN ({duedate} < {today}) THEN {fxamount} ELSE 0 END');
    arrColumns[1].setLabel("w1");
    arrColumns[1].setLabel("ww1");
    arrColumns[2] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[2].setFormula("CASE WHEN ({duedate} between {today} and {today}+7) THEN {fxamount} ELSE 0 END");
    arrColumns[2].setLabel("w2");
    arrColumns[2].setLabel("ww2");
    arrColumns[3] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[3].setFormula("CASE WHEN ({duedate} between {today}+8 and {today}+14) THEN {fxamount} ELSE 0 END");
    arrColumns[3].setLabel("w3");
    arrColumns[3].setLabel("ww3");
    arrColumns[4] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[4].setFormula("CASE WHEN ({duedate} between {today}+15and {today}+28) THEN {fxamount} ELSE 0 END");
    arrColumns[4].setLabel("w4");
    arrColumns[4].setLabel("ww4");
    arrColumns[5] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[5].setFormula("CASE WHEN ({duedate} > {today}+28 ) THEN {fxamount} ELSE 0 END");
    arrColumns[5].setLabel("w5");
    arrColumns[5].setLabel("ww5");


    //var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_accreceivable', arrFilters, arrColumns);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_testreceive', arrFilters, arrColumns);

    var columns = arrTransactions[0].getAllColumns();
    for (var i = 0; i < columns.length ; i++) {
        nlapiLogExecution('DEBUG', ' -column', columns[i].getName());
    }
    return arrTransactions;
}
/**
 * This function gets the items based on the from/to date and location.
 *
 * @param request
 * @returns array
 */
function getPayables(request) {
    var LOG_TITLE = 'getPayables';
    var arrFilters = [];
    var arrColumns = [];

    arrColumns[0] = new nlobjSearchColumn('accounttype', null, 'group');
    //arrColumns[0].setFormula("{Net Amount} = 'Net Amount'");
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula('CASE WHEN ({duedate} < {today}) THEN {fxamount} ELSE 0 END');
    arrColumns[1].setLabel("w1");
    arrColumns[1].setLabel("ww1");
    arrColumns[2] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[2].setFormula("CASE WHEN ({duedate} between {today} and {today}+7) THEN {fxamount} ELSE 0 END");
    arrColumns[2].setLabel("w2");
    arrColumns[2].setLabel("ww2");
    arrColumns[3] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[3].setFormula("CASE WHEN ({duedate} between {today}+8 and {today}+14) THEN {fxamount} ELSE 0 END");
    arrColumns[3].setLabel("w3");
    arrColumns[3].setLabel("ww3");
    arrColumns[4] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[4].setFormula("CASE WHEN ({duedate} between {today}+15and {today}+28) THEN {fxamount} ELSE 0 END");
    arrColumns[4].setLabel("w4");
    arrColumns[4].setLabel("ww4");
    arrColumns[5] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[5].setFormula("CASE WHEN ({duedate} > {today}+28 ) THEN {fxamount} ELSE 0 END");
    arrColumns[5].setLabel("w5");
    arrColumns[5].setLabel("ww5");



    ///var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_payablesearch', arrFilters, arrColumns);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_testpayable', arrFilters, arrColumns);

    return arrTransactions;
}

function getBank(request) {

    var LOG_TITLE = 'getPayables';
    var arrFilters = [];
    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('formulatext', null, 'group').setFormula("'Cash'");
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula("CASE WHEN {trandate} <= {today} and {accounttype}='Bank' THEN {fxamount} ELSE 0 END");
    arrColumns[1].setLabel("w1");
    arrColumns[1].setLabel("ww1");
    arrColumns[2] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[2].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({duedate})<{today} AND {status}='Open' THEN ({fxamount}*-1) when {accounttype} ='Accounts Receivable' AND ROUND({duedate})<{today} And {status}='Open' THEN ({fxamount})  when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end");
    arrColumns[2].setLabel("w2");
    arrColumns[2].setLabel("ww2");
    arrColumns[3] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[3].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND ROUND( {duedate}) <Round({today}+7) AND {status}='Open' THEN ({fxamount}*-1)  when {accounttype} ='Accounts Receivable' AND ROUND( {duedate}) <ROUND({today}+7) And {status}='Open' THEN ({fxamount}) when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end)");
    arrColumns[3].setLabel("w3");
    arrColumns[3].setLabel("ww3");
    arrColumns[4] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[4].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND  ROUND({duedate})<=Round({today}+21) AND {status}='Open' THEN ({fxamount}*-1) 	when {accounttype} ='Accounts Receivable' AND  ROUND({duedate})<=ROUND({today}+21) And {status}='Open' THEN ({fxamount}) 	when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end) ");
    arrColumns[4].setLabel("w4");
    arrColumns[4].setLabel("ww4");
    arrColumns[5] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[5].setFormula("	(CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({duedate})<=Round({today}+28) AND {status}='Open' THEN ({fxamount}*-1) when {accounttype} ='Accounts Receivable' AND ROUND({duedate})<=ROUND({today}+28) And {status}='Open' THEN ({fxamount}) when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end)");
    arrColumns[5].setLabel("w5");
    arrColumns[5].setLabel("ww5");


    //var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_cashsearch', arrFilters, arrColumns);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_testcash', arrFilters, arrColumns);
    return arrTransactions;
}

function getNet(request) {
    var LOG_TITLE = 'getPayables';
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('accounttype', null, 'anyOf', ['Bank', 'Accounts Receivable', 'Accounts Payable']));
    // var arrColumns = [];

    var arrColumns = new Array();
    arrColumns[0] = new nlobjSearchColumn('formulatext', null, 'group').setFormula("'Net Amount'");
    //arrColumns[0].setFormula("{Net Amount} = 'Net Amount'");
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({duedate})<{today} AND {status}='Open' THEN ({fxamount}*-1) when {accounttype} ='Accounts Receivable' AND ROUND({duedate})<{today} And {status}='Open' THEN ({fxamount})  when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end");
    arrColumns[1].setLabel("w1");
    arrColumns[1].setLabel("ww1");
    arrColumns[2] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[2].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND ROUND( {duedate}) <Round({today}+7) AND {status}='Open' THEN ({fxamount}*-1)  when {accounttype} ='Accounts Receivable' AND ROUND( {duedate}) <ROUND({today}+7) And {status}='Open' THEN ({fxamount}) when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end)");
    arrColumns[2].setLabel("w2");
    arrColumns[2].setLabel("ww2");
    arrColumns[3] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[3].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND  ROUND({duedate})<=Round({today}+21) AND {status}='Open' THEN ({fxamount}*-1) 	when {accounttype} ='Accounts Receivable' AND  ROUND({duedate})<=ROUND({today}+21) And {status}='Open' THEN ({fxamount}) 	when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end) ");
    arrColumns[3].setLabel("w3");
    arrColumns[3].setLabel("ww3");
    arrColumns[4] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[4].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({duedate})<=Round({today}+28) AND {status}='Open' THEN ({fxamount}*-1) when {accounttype} ='Accounts Receivable' AND ROUND({duedate})<=ROUND({today}+28) And {status}='Open' THEN ({fxamount}) when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end)");
    arrColumns[4].setLabel("w4");
    arrColumns[4].setLabel("ww4");
    arrColumns[5] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[5].setFormula("(CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({today} - {duedate}) >7 AND {status}='Open' THEN ({fxamount}*-1)    when {accounttype} ='Accounts Receivable' AND ROUND({today} - {duedate}) >7 And {status}='Open' THEN ({fxamount})       when {accounttype} ='Bank' AND {trandate}<{today} THEN ({fxamount}) else 0 end)    +   (CASE WHEN {accounttype} ='Accounts Payable' AND ROUND({today}+7) < {duedate} AND {status}='Open' THEN ({fxamount}*-1)   when {accounttype} ='Accounts Receivable' AND ROUND({today}+7) < {duedate} AND {status}='Open' THEN ({fxamount}) else 0 end)    ");
    arrColumns[5].setLabel("w5");
    arrColumns[5].setLabel("ww5");


    var arrTransactions = nlapiSearchRecord('transaction', null, arrFilters, arrColumns);
    return arrTransactions;
}
function getNetReceivable(request) {
    var LOG_TITLE = 'getPayables';
    var arrFilters = [];
    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('formulatext', null, 'group').setFormula("'Projected'");
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND ({duedate}< {today}) THEN ({fxamount}*-1)        when {accounttype} ='Accounts Receivable' AND ({duedate}< {today}) THEN ({fxamount})else 0 end");
    arrColumns[1].setLabel("w1");
    arrColumns[1].setLabel("ww1");
    arrColumns[2] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[2].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND({duedate} between {today} and {today}+7) THEN ({fxamount}*-1)  when {accounttype} ='Accounts Receivable' AND({duedate} between {today} and {today}+7) THEN ({fxamount}) else 0 end");
    arrColumns[2].setLabel("w2");
    arrColumns[2].setLabel("ww2");
    arrColumns[3] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[3].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND({duedate} between {today}+8 and {today}+14) THEN ({fxamount}*-1)  when {accounttype} ='Accounts Receivable' AND({duedate} between {today}+8 and {today}+14) THEN ({fxamount}) else 0 end");
    arrColumns[3].setLabel("w3");
    arrColumns[3].setLabel("ww3");
    arrColumns[4] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[4].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND({duedate} between {today}+15 and {today}+28) THEN ({fxamount}*-1)        when {accounttype} ='Accounts Receivable' AND({duedate} between {today}+15 and {today}+28) THEN ({fxamount}) else 0 end");
    arrColumns[4].setLabel("w4");
    arrColumns[4].setLabel("ww4");
    arrColumns[5] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[5].setFormula("CASE WHEN {accounttype} ='Accounts Payable' AND({duedate}> {today}+28)  THEN ({fxamount}*-1)  when {accounttype} ='Accounts Receivable' AND({duedate}> {today}+28) THEN ({fxamount}) else 0 end");
    arrColumns[5].setLabel("w5");
    arrColumns[5].setLabel("ww5");

    // var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_netrecsearch', arrFilters, arrColumns);     
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_testnet', arrFilters, arrColumns);
    return arrTransactions;
}


function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

function todaydate() {
    var now = new Date();
    var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    var dd = now_utc.getUTCDate(); //according to universal time
    var mm = now_utc.getUTCMonth() + 1;
    var yyyy = now_utc.getUTCFullYear();
    var ayHours = mm + '/' + dd + '/' + yyyy;

    return ayHours;

}