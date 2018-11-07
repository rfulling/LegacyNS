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

    var startDate = '01/01/2014';
    var endDate = '12/31/2014';

    var sl_items = _SEARCHFORM.addSubList('custpage_sl_items', 'list', 'Items');
    //create fields to reflect the same fields from the record where it is being fetched
    sl_items.addField('custpage_chkbox', 'checkbox', 'Choose').setDisplayType('hidden');
    sl_items.addField('custpage_label', 'Text', 'Item').setDisplayType('inline');
    //sl_items.addField('custpage_date', 'date', 'Date').setDisplayType('inline');
    sl_items.addField('custpage_qty', 'integer', 'Quantity').setDisplayType('hidden');
    //sl_items.addField('custpage_fromqtyonhand', 'integer', 'From Available').setDisplayType('inline');

    sl_items.addField('custpage_year1', 'currency', 'This Week: ').setDisplayType('inline');
    sl_items.addField('custpage_prioryear', 'currency', 'Next Week: ').setDisplayType('inline');
   

    var arrProjected = [{ 'accounttype': 'projectedCF' }];
    //start search
    var arrThisYearSales = getThisYearSales(request,startDate,endDate);
   // var arrPrevYearSales = getPrioryearSales(request);
    

    //nlapiLogExecution('DEBUG', 'arrBank',JSON.stringify(arrBank));
    //nlapiLogExecution('DEBUG', 'arrItems',JSON.stringify(arrItems));
    //nlapiLogExecution('DEBUG', 'arrPayables',JSON.stringify(arrPayables));
    //nlapiLogExecution('DEBUG', 'arrCashNet',JSON.stringify(arrCashNet));
    //nlapiLogExecution('DEBUG', 'arrNet',JSON.stringify(arrNet));

    if (arrThisYearSales == null) {
        arrThisYearSales = [];
    }
   // if (arrPrevYearSales == null) {
  //      arrPrevYearSales = [];
  //  }
   
  
    //arrThisYearSales = arrThisYearSales.concat(arrPrevYearSales);


    nlapiLogExecution('DEBUG', 'thisYear', JSON.stringify(arrThisYearSales));
    //nlapiLogExecution('DEBUG', 'PriorYear', JSON.stringify(arrPrevYearSales));
   


    if (arrThisYearSales) {
        //assign values to line fields
        for (var i = 0; i < arrThisYearSales.length; i++) {

            nlapiLogExecution('DEBUG', 'Sales : ' + arrThisYearSales[i].getValue('location', null, 'group'));

            sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'F');
            if (!isEmpty(arrThisYearSales[i].getText('location', null, 'group'))) {
                sl_items.setLineItemValue('custpage_label', (i + 1), arrThisYearSales[i].getText('location', null, 'group'));
            }
           

            //next get  alist of columns loop through the colums an of the result set and
            //put them on the grid.
            var cols = arrThisYearSales[i].getAllColumns();
            for (var c = 0; c < cols.length; c++) {
                var colab = cols[c].label;
                switch (colab) {
                    case 'ww1': //label: PaymentAmountLeft
                        sl_items.setLineItemValue('custpage_year1', (i + 1), arrThisYearSales[i].getValue(cols[c]));
                        break;
                    case 'ww2':
                        sl_items.setLineItemValue('custpage_prioryear', (i + 1), arrThisYearSales[i].getValue(cols[c]));
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

/**
 * This function gets the items based on the from/to date and location.
 *
 * @param request
 * @returns array
 */


function getThisYearSales(request,startDate,endDate) {

    var LOG_TITLE = 'getThisYearSales';
    var arrFilters = [];
    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('location', null, 'group').setLabel('Location');
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula("CASE WHEN {trandate} between TO_DATE('01.01.2014', 'DD.MM.YYYY') and TO_DATE('31.12.2014', 'DD.MM.YYYY') THEN {fxamount} ELSE 0 END");
    arrColumns[1].setLabel("CompSales");
    arrColumns[1].setLabel("ww1");


    //var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_cashsearch', arrFilters, arrColumns);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch156', arrFilters, arrColumns);
    return arrTransactions;
}
function getPrioryearSales(request) {

    var LOG_TITLE = 'getThisYearSales';
    var arrFilters = [];
    var arrColumns = [];
    arrColumns[0] = new nlobjSearchColumn('location', null, 'group').setLabel('Location');
    arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'SUM');
    arrColumns[1].setFormula("CASE WHEN {trandate} between TO_DATE('01.01.2014', 'DD.MM.YYYY') and TO_DATE('31.12.2014', 'DD.MM.YYYY') THEN {fxamount} ELSE 0 END");
    arrColumns[1].setLabel("CompSalesPre");
    arrColumns[1].setLabel("ww2");


    //var arrTransactions = nlapiSearchRecord('transaction', 'customsearch_cashsearch', arrFilters, arrColumns);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch156', arrFilters, arrColumns);
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