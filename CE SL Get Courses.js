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
 * 1.0        12 Dec 2014     Julius Cuanan
 * 1.1        17 Mar 2015     Julius Cuanan	   Update in the suitelet
 * 1.2        24 Mar 2015     Julius Cuanan	   Update in the suitelet
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
    LOG_TITLE = 'main';
    try {
        //assign a parameter to check on what stage of the suitelet you are already at and to create the corresponding form for that stage
        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', LOG_TITLE, 'Action: ' + stAction);

        switch (stAction) {
            //upon clicking the 'Search Item(s)' button
            case 'GET_ITEMS':
                var form = page_getItems(request);
                response.writePage(form);
                break;
                //upon submitting
            case 'PROCESS':
                var form = doAddItems(request);
                response.writePage(form);
                break;
                //upon loading
            default:
                var form = page_startSearch(request);
                response.writePage(form);
                break;
        }
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
function page_startSearch(request) {
    var LOG_TITLE = 'page_startSearch';

   var stUser = nlapiGetUser();
    var objEmpLocation = '';
    var objEmpLocationLabel = nlapiLookupField('employee', stUser, ['location', 'custentity_lbc_default_from_loc'], true);

    if (!objEmpLocationLabel['customrecord_rtf_course_group']) {
        objEmpLocationLabel['customrecord_rtf_course_group'] = 'Courses';
    }
    if (!objEmpLocationLabel['custentity_lbc_default_from_loc']) {
        objEmpLocationLabel['custentity_lbc_default_from_loc'] = 'From Location';
    }

    objEmpLocationLabel = 'to';
    var _SEARCHFORM = nlapiCreateForm('Search Item(s)');

    //buttons for choosing on how the searching for the items will execute
    _SEARCHFORM.addSubmitButton('Load Item(s)');

    //the search field for the item
    //_SEARCHFORM.addField('custpage_lcb_from_date', 'date', 'From').setDisplayType('normal');
    //_SEARCHFORM.addField('custpage_lcb_to_date', 'date', 'To').setDisplayType('normal');
    //_SEARCHFORM.addField('custpage_lcb_location', 'select', 'ToLoc', 'location').setDisplayType('normal').setDefaultValue(objEmpLocation['location']);
    _SEARCHFORM.addField('custpage_lbc_from_location', 'select', 'customrecord_rtf_course_group', 'customrecord_rtf_course_group').setDisplayType('normal');
    _SEARCHFORM.addField('custpage_lbc_to_location_label', 'text', 'x').setDisplayType('normal').setDefaultValue(objEmpLocationLabel['customrecord_rtf_course_group']);
    //_SEARCHFORM.addField('custpage_lbc_from_location_label', 'text', 'From Location Label').setDisplayType('normal').setDefaultValue(objEmpLocationLabel['custentity_lbc_default_from_loc']);
    //_SEARCHFORM.addField('custpage_lcb_ship_date', 'date', 'Ship Datewee').setDisplayType('normal').setMandatory(true);

    //store in a parameter the values needed for processing the records
    //_SEARCHFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('GET_ITEMS');

    return _SEARCHFORM;
}

/**
 * This function creates the result form to be shown upon clicking the button 'Get Selected Item' on the suitelet.
 * That is after the item has been populated.
 *
 * @param request
 * @returns nlobjForm
 */
function page_getItems(request) {
    var LOG_TITLE = 'page_getItems';

    var _PROCESSFORM = nlapiCreateForm('Item(s) based on location');

    //var stToLabel = nlapiLookupField('location', request.getParameter('custpage_lcb_location'), 'name');
    var stFromLabel = nlapiLookupField('customrecord_rtf_course_group', request.getParameter('custpage_lbc_from_location'), 'name');

    //store in a parameter the values needed for processing the records
    //_PROCESSFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('PROCESS');
    //_PROCESSFORM.addField('custpage_lcb_location', 'select', request.getParameter('custpage_lbc_to_location_label'), 'customrecord_rtf_course_group').setDisplayType('inline').setDefaultValue(request.getParameter('customrecord_rtf_course_group'));
    //_PROCESSFORM.addField('custpage_lbc_from_location', 'select', request.getParameter('custpage_lbc_from_location_label'), 'location').setDisplayType('inline').setDefaultValue(request.getParameter('custpage_lbc_from_location'));
    _PROCESSFORM.addField('custrecord_rtf_courseid', 'text', 'Course').setDisplayType('normal');



    //create the sublist to contain the result of the searching
    var sl_items = _PROCESSFORM.addSubList('custpage_sl_items', 'list', 'Items');

    //create fields to reflect the same fields from the record where it is being fetched
    sl_items.addField('custpage_chkbox', 'checkbox', 'Choose').setDisplayType('normal');
    sl_items.addField('custpage_item', 'select', 'Item', 'item').setDisplayType('inline');
    //sl_items.addField('custpage_date', 'date', 'Date').setDisplayType('inline');
    sl_items.addField('custpage_qty', 'integer', 'Quantity').setDisplayType('entry');
    sl_items.addField('custpage_fromqtyonhand', 'integer', 'From On Hand').setDisplayType('inline');
    sl_items.addField('custpage_toqtyonhand', 'integer', 'To On Hand').setDisplayType('inline');
    sl_items.addField('custpage_toqtyonorder', 'integer', 'To On Hand').setDisplayType('inline');
    sl_items.addMarkAllButtons();

    //start search
    var arrItems = getItems(request);
    nlapiLogExecution('DEBUG', LOG_TITLE, 'Items Search Results length: ' + arrItems.length);

    if (arrItems) {
        //assign values to line fields
        for (var i = 0; i < arrItems.length; i++) {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'Item: ' + arrItems[i]);

            var arrLineDetails = arrItems[i].split('|');
            sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'T');
            //sl_items.setLineItemValue('custpage_item', (i + 1), arrLineDetails[0]);
            sl_items.setLineItemValue('custpage_date', (i+1), arrLineDetails[1]);
            sl_items.setLineItemValue('custpage_qty', (i + 1), arrLineDetails[2]);
            sl_items.setLineItemValue('custpage_fromqtyonhand', (i + 1), arrLineDetails[2]);
            sl_items.setLineItemValue('custpage_toqtyonhand', (i + 1), arrLineDetails[3]);
            sl_items.setLineItemValue('custpage_toqtyonorder', (i + 1), arrLineDetails[4]);
        }
    }

  //  _PROCESSFORM.addSubmitButton('Create Transfer Order');
    _PROCESSFORM.addButton('Back', 'Back', 'history.go(-1);');

    return _PROCESSFORM;
}

/**
 * This function gets the items based on the from/to date and location.
 *
 * @param request
 * @returns array
 */
function getItems(request) {
    var LOG_TITLE = 'getItems';

    var SEARCHFILTER_INVOICE = 'CustInvc';

  //  var stFromDate = request.getParameter('custpage_lcb_from_date');
   // var stToDate = request.getParameter('custpage_lcb_to_date');
    var stLocation = request.getParameter('custpage_lcb_location');
 //   var stFromLocation = request.getParameter('custpage_lbc_from_location');
    var arrItems = [];

    var arrFilters = [];
  //  arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));
    arrFilters.push(new nlobjSearchFilter('location', null, 'anyof', stLocation));
 //   arrFilters.push(new nlobjSearchFilter('type', 'item', 'anyof', 'InvtPart'));
  //  arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', SEARCHFILTER_INVOICE));

    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('custrecord_rtf_courseid', null, null).setSort());
    //arrColumns.push(new nlobjSearchColumn('quantity', null, 'sum'));

   // nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
   /// nlapiLogExecution('DEBUG', 'search Criteria', 'location  ' + stLocation + 'tranType  ' + SEARCHFILTER_INVOICE);

    var arrTransactions = nlapiSearchRecord('customrecord_rtf_course', null, arrFilters, arrColumns);

    if (arrTransactions) {
        for (var i = 0; i < arrTransactions.length; i++) {
            var arrItemDetails = [];
            var stItem = arrTransactions[i].getValue('customrecord_rtf_course', null,null);
            //var stQty = arrTransactions[i].getValue('quantity', null, 'sum');

            var arrFilter1 = new Array();
            var arrColumns1 = new Array();

            //arrColumns1.push(new nlobjSearchColumn('locationquantityonhand'));
            //arrFilter1.push(new nlobjSearchFilter('internalid', null, 'anyof', stItem));
            //arrFilter1.push(new nlobjSearchFilter('inventorylocation', null, 'anyof', stFromLocation));

            //var recFromItemQntyOnHandRecord = getItemRecord(arrFilter1, arrColumns1);
            //var stFromQntyOnHand = 0;
            //if (isEmpty(recFromItemQntyOnHandRecord) == false) {
             //   stFromQntyOnHand = recFromItemQntyOnHandRecord[0].getValue('locationquantityonhand');
           // }


            //arrFilter1 = new Array();

            //arrFilter1.push(new nlobjSearchFilter('internalid', null, 'anyof', stItem));
            //arrFilter1.push(new nlobjSearchFilter('inventorylocation', null, 'anyof', stLocation));

            //var recToItemQntyOnHandRecord = getItemRecord(arrFilter1, arrColumns1);
            //var stToQntyOnHand = 0;
            //if (isEmpty(recToItemQntyOnHandRecord) == false) {
             //   stToQntyOnHand = recToItemQntyOnHandRecord[0].getValue('locationquantityonhand');
            //}


            arrItemDetails.push(stItem);
            //arrItemDetails.push(stQty);
            //arrItemDetails.push(stFromQntyOnHand);
            //arrItemDetails.push(stToQntyOnHand);

            arrItemDetails = arrItemDetails.join('|');
            arrItems.push(arrItemDetails);
        }
    }

    return arrItems;
}

/**
 * This function is used to add the line items from the suitelet to the to be created Transfer Order transaction.
 *
 * @param request
 * @returns {String}
 */function doAddItems(request) {
     var LOG_TITLE = 'doAddItems';
     try {
         var arrLineDetails = [];//array to hold the items to be added to the transaction
         var intLineItemCount = request.getLineItemCount('custpage_sl_items');
         nlapiLogExecution('DEBUG', LOG_TITLE, 'Suitelet Sublist Items Count: ' + intLineItemCount);

         var TO_LOCATION = request.getParameter('custpage_lbc_from_location');
         var SHIP_DATE = request.getParameter('custpage_lcb_ship_date');

         for (var i = 1; i <= intLineItemCount; i++) {
             var bIsItemSelected = (request.getLineItemValue('custpage_sl_items', 'custpage_chkbox', i) == 'T' ? true : false);

             //add the item to the array of items to be added to the transaction if the quantity is > 0
             if (bIsItemSelected) {
                 var objItemDetails = new Object();

                 objItemDetails.item = request.getLineItemValue('custpage_sl_items', 'custpage_item', i);
                 objItemDetails.qty = parseInt(request.getLineItemValue('custpage_sl_items', 'custpage_qty', i));

                 arrLineDetails.push(objItemDetails);
             }
         }

         var recTransferOrder = nlapiCreateRecord('transferorder');
         recTransferOrder.setFieldValue('shipdate', SHIP_DATE);

         var LOCATION_CENTRAL_WAREHOUSE = '1';
         recTransferOrder.setFieldValue('location', TO_LOCATION);
         //recTransferOrder.setFieldValue('location', LOCATION_CENTRAL_WAREHOUSE);

         var STATUS_PENDING_APPROVAL = 'A';
         recTransferOrder.setFieldValue('orderstatus', STATUS_PENDING_APPROVAL);

         var TRAN_DATE = nlapiDateToString(new Date(), 'date');
         recTransferOrder.setFieldValue('trandate', TRAN_DATE);

         recTransferOrder.setFieldValue('transferlocation', request.getParameter('custpage_lcb_location'));

         //add each line item to the transaction
         for (var i = 0; i < arrLineDetails.length; i++) {
             var objItemDetails = arrLineDetails[i];

             recTransferOrder.selectNewLineItem('item');
             recTransferOrder.setCurrentLineItemValue('item', 'item', objItemDetails.item);
             recTransferOrder.setCurrentLineItemValue('item', 'quantity', objItemDetails.qty);
             recTransferOrder.commitLineItem('item');
         }

         var stTransferOrderId = nlapiSubmitRecord(recTransferOrder, false, true);
         nlapiLogExecution('DEBUG', LOG_TITLE, 'Create Transfer Order ID: ' + stTransferOrderId);

         var _SUCCESSFORM = nlapiCreateForm('Created Transfer Order Status');
         var arrMsg = [];

         if (stTransferOrderId) {
             var stURL = nlapiResolveURL('RECORD', 'transferorder', stTransferOrderId);
             var stTranId = nlapiLookupField('transferorder', stTransferOrderId, 'tranid');

             arrMsg.push('The following Transfer Order transaction has been created:');
             arrMsg.push('<a href="' + stURL + '" target="_blank">Transfer Order #' + stTranId + '</a>');

             _SUCCESSFORM.addField('custpage_transferorder_link', 'inlinehtml', '').setDefaultValue(confirmationText(arrMsg.join('<br />')));
         }

         return _SUCCESSFORM;
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

function confirmationText(details) {
    if (details) {
        var stConfirmation = '<div width="100%" class="uir-alert-box confirmation session_confirmation_alert" style=""><div class="icon confirmation"><img alt="" src="/images/icons/messagebox/icon_msgbox_confirmation.png"></div><div class="content"><div class="title">Confirmation</div><div class="descr">{0}</div></div></div>'.format(details);

        return stConfirmation;
    }
    return '';
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

function inArray(val, arr) {
    var bIsValueFound = false;

    for (var i = 0; i < arr.length; i++) {
        if (val == arr[i]) {
            bIsValueFound = true;
            break;
        }
    }

    return bIsValueFound;
}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

function getItemRecord(arrFilters, arrColumns) {
    var logTitle = 'getItemRecord';
    try {
        var arrTransactions = nlapiSearchRecord('item', null, arrFilters, arrColumns);
        if (isEmpty(arrTransactions) == false) {
            if (arrTransactions.length == 1) {
                return arrTransactions;
            } else {
                throw nlapiCreateError('99999', 'Savesearch return more than 1 result');
            }
        }
        return null;
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('DEBUG', 'Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('DEBUG', 'Unexpected Error: ', error.toString());
            throw error;
        }
    }
}/**
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
 * 1.0        12 Dec 2014     Julius Cuanan
 * 1.1        17 Mar 2015     Julius Cuanan	   Update in the suitelet
 * 1.2        24 Mar 2015     Julius Cuanan	   Update in the suitelet
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
    LOG_TITLE = 'main';
    try {
        //assign a parameter to check on what stage of the suitelet you are already at and to create the corresponding form for that stage
        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', LOG_TITLE, 'Action: ' + stAction);

        switch (stAction) {
            //upon clicking the 'Search Item(s)' button
            case 'GET_ITEMS':
                var form = page_getItems(request);
                response.writePage(form);
                break;
                //upon submitting
            case 'PROCESS':
                var form = doAddItems(request);
                response.writePage(form);
                break;
                //upon loading
            default:
                var form = page_startSearch(request);
                response.writePage(form);
                break;
        }
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
function page_startSearch(request) {
    var LOG_TITLE = 'page_startSearch';

    var stUser = nlapiGetUser();
    var objEmpLocation = 'customrecord_rtf_course_group';
   // var objEmpLocationLabel = nlapiLookupField('employee', stUser, ['location', 'custentity_lbc_default_from_loc'], true);
    
    //if (!objEmpLocationLabel['location']) {
     //   objEmpLocationLabel['location'] = 'To Location';
    //}

   // if (!objEmpLocationLabel['custentity_lbc_default_from_loc']) {
    //    objEmpLocationLabel['custentity_lbc_default_from_loc'] = 'From Location';
   // }

    var _SEARCHFORM = nlapiCreateForm('Search Item(s)');

    //buttons for choosing on how the searching for the items will execute
    _SEARCHFORM.addSubmitButton('Load Item(s)');

    //the search field for the item
   // _SEARCHFORM.addField('custpage_lcb_from_date', 'date', 'From').setDisplayType('normal');
   // _SEARCHFORM.addField('custpage_lcb_to_date', 'date', 'To').setDisplayType('normal');
   // _SEARCHFORM.addField('custpage_lcb_location', 'select', 'To Location: ', 'location').setDisplayType('normal').setDefaultValue(objEmpLocation['location']);
    _SEARCHFORM.addField('custpage_lbc_from_location', 'select', 'Course Group: ', 'customrecord_rtf_course_group').setDisplayType('normal');
   // _SEARCHFORM.addField('custpage_lbc_to_location_label', 'text', 'To Location Label').setDisplayType('hidden').setDefaultValue(objEmpLocationLabel['location']);
   // _SEARCHFORM.addField('custpage_lbc_from_location_label', 'text', 'From Location Label').setDisplayType('hidden').setDefaultValue(objEmpLocationLabel['custentity_lbc_default_from_loc']);
   // _SEARCHFORM.addField('custpage_lcb_ship_date', 'date', 'Ship Date').setDisplayType('normal').setMandatory(true);

    //store in a parameter the values needed for processing the records
    _SEARCHFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('GET_ITEMS');

    return _SEARCHFORM;
}

/**
 * This function creates the result form to be shown upon clicking the button 'Get Selected Item' on the suitelet.
 * That is after the item has been populated.
 *
 * @param request
 * @returns nlobjForm
 */
function page_getItems(request) {
    var LOG_TITLE = 'page_getItems';

  //  var stToLabel = nlapiLookupField('location', request.getParameter('custpage_lcb_location'), 'name');
    //var stFromLabel = nlapiLookupField('location', request.getParameter('custpage_lbc_from_location'), 'name');

    var _PROCESSFORM = nlapiCreateForm('Item(s) based on location');

    //store in a parameter the values needed for processing the records
    _PROCESSFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('PROCESS');

    //_PROCESSFORM.addField('custpage_lcb_location', 'select', request.getParameter('custpage_lbc_to_location_label'), 'customrecord_rtf_course_group').setDisplayType('inline').setDefaultValue(request.getParameter('custpage_lcb_location'));
    _PROCESSFORM.addField('custpage_lbc_from_location', 'select', request.getParameter('custpage_lbc_from_location_label'), 'customrecord_rtf_course_group').setDisplayType('inline').setDefaultValue(request.getParameter('custpage_lbc_from_location'));

  //_PROCESSFORM.addField('custpage_lcb_location', 'select', 'Transfer To:', 'location').setDisplayType('inline').setDefaultValue(request.getParameter('custpage_lcb_location'));
 //   _PROCESSFORM.addField('custpage_lbc_from_location', 'select', 'Transfer From:', 'location').setDisplayType('inline').setDefaultValue(request.getParameter('custpage_lbc_from_location'));


//    _PROCESSFORM.addField('custpage_lcb_ship_date', 'date', 'Ship Date').setDisplayType('inline').setMandatory(true).setDefaultValue(request.getParameter('custpage_lcb_ship_date'));

    //create the sublist to contain the result of the searching
    var sl_items = _PROCESSFORM.addSubList('custpage_sl_items', 'list', 'Items');

    //create fields to reflect the same fields from the record where it is being fetched
   sl_items.addField('custpage_chkbox', 'checkbox', 'Choose').setDisplayType('normal');
   sl_items.addField('custpage_item', 'text', 'Course','group').setDisplayType('inline');
   sl_items.addField('custpage_date', 'text', 'Name').setDisplayType('normal');
   sl_items.addField('custpage_qty', 'text', 'CourseID').setDisplayType('inline');
    //sl_items.addField('custpage_fromqtyonhand', 'integer', 'From  : Qty On Hand').setDisplayType('inline');
    //sl_items.addField('custpage_toqtyonhand', 'integer', 'To : Qty On Hand').setDisplayType('inline');

    sl_items.addMarkAllButtons();

    //start search
    var arrItems = getItems(request);
    nlapiLogExecution('DEBUG', LOG_TITLE, 'Items Search Results length: ' + arrItems.length);

    if (arrItems) {
        //assign values to line fields
        for (var i = 0; i < arrItems.length; i++) {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'Item: ' + arrItems[i]);

            var arrLineDetails = arrItems[i].split('|');
            sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'T');
            sl_items.setLineItemValue('custpage_item', (i + 1), arrLineDetails[0]);
            sl_items.setLineItemValue('custpage_date', (i+1), arrLineDetails[1]);
            sl_items.setLineItemValue('custpage_qty', (i + 1), arrLineDetails[2]);
            sl_items.setLineItemValue('custpage_fromqtyonhand', (i + 1), arrLineDetails[2]);
            sl_items.setLineItemValue('custpage_toqtyonhand', (i + 1), arrLineDetails[3]);
            sl_items.setLineItemValue('custpage_toqtyonorder', (i + 1), arrLineDetails[4]);
        }
    }

  //  _PROCESSFORM.addSubmitButton('Create Transfer Order');
    _PROCESSFORM.addButton('Back', 'Back', 'history.go(-1);');

    return _PROCESSFORM;
}

/**
 * This function gets the items based on the from/to date and location.
 *
 * @param request
 * @returns array
 */
function getItems(request) {
    var LOG_TITLE = 'getItems';

    var SEARCHFILTER_INVOICE = 'CustInvc';

   // var stFromDate = request.getParameter('custpage_lcb_from_date');
   // var stToDate = request.getParameter('custpage_lcb_to_date');
   // var stLocation = request.getParameter('custpage_lcb_location');
    var stFromLocation = request.getParameter('custpage_lbc_from_location');
    var arrItems = [];

    var arrFilters = [];
   // arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));
    arrFilters.push(new nlobjSearchFilter('custrecord_coursegroup_id', null, 'anyof', stFromLocation));
   // arrFilters.push(new nlobjSearchFilter('type', 'item', 'anyof', 'InvtPart'));
   // arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', SEARCHFILTER_INVOICE));

    var arrColumns = [];
    //arrColumns.push(new nlobjSearchColumn('custrecord_rtf_courseid', null, null).setSort());
    arrColumns.push(new nlobjSearchColumn('custrecord_rtf_course_name', null, 'group'));

   // nlapiLogExecution('DEBUG', 'search Criteria', 'from Course ' + stFromDate + 'endDate ' + stFromLocation);
    

    var arrTransactions = nlapiSearchRecord('customrecord_rtf_course', null, arrFilters, arrColumns);

    if (arrTransactions) {
        for (var i = 0; i < arrTransactions.length; i++) {
            var arrItemDetails = [];
            var stItem = arrTransactions[i].getValue('custrecord_rtf_courseid', null, null);
            var stQty = arrTransactions[i].getValue('custrecord_rtf_course_name', null, 'group');

            var arrFilter1 = new Array();
            var arrColumns1 = new Array();

            arrColumns1.push(new nlobjSearchColumn('custrecord_rtf_courseid'));
            arrFilter1.push(new nlobjSearchFilter('custrecord_coursegroup_id', null, 'anyof', stFromLocation));
           //arrFilter1.push(new nlobjSearchFilter('inventorylocation', null, 'anyof', stFromLocation));

            var recOfCoursIDs = getItemRecord(arrFilter1, arrColumns1);
            var stCourseIDs = 0;
           


            //arrFilter1 = new Array();

            //arrFilter1.push(new nlobjSearchFilter('internalid', null, 'anyof', stItem));
            //arrFilter1.push(new nlobjSearchFilter('inventorylocation', null, 'anyof', stLocation));

            //var recToItemQntyOnHandRecord = getItemRecord(arrFilter1, arrColumns1);
            //var stToQntyOnHand = 0;
            //if (isEmpty(recToItemQntyOnHandRecord) == false) {
             //   stToQntyOnHand = recToItemQntyOnHandRecord[0].getValue('locationquantityonhand');
            //}


            arrItemDetails.push(stItem);
            arrItemDetails.push(stQty);
            arrItemDetails.push(recOfCoursIDs);
            //arrItemDetails.push(stToQntyOnHand);

            arrItemDetails = arrItemDetails.join('|');
            arrItems.push(arrItemDetails);
        }
    }

    return arrItems;
}

/**
 * This function is used to add the line items from the suitelet to the to be created Transfer Order transaction.
 *
 * @param request
 * @returns {String}
 */function doAddItems(request) {
     var LOG_TITLE = 'doAddItems';
     try {
         var arrLineDetails = [];//array to hold the items to be added to the transaction
         var intLineItemCount = request.getLineItemCount('custpage_sl_items');
         nlapiLogExecution('DEBUG', LOG_TITLE, 'Suitelet Sublist Items Count: ' + intLineItemCount);

         var TO_LOCATION = request.getParameter('custpage_lbc_from_location');
         var SHIP_DATE = request.getParameter('custpage_lcb_ship_date');

         for (var i = 1; i <= intLineItemCount; i++) {
             var bIsItemSelected = (request.getLineItemValue('custpage_sl_items', 'custpage_chkbox', i) == 'T' ? true : false);

             //add the item to the array of items to be added to the transaction if the quantity is > 0
             if (bIsItemSelected) {
                 var objItemDetails = new Object();

                 objItemDetails.item = request.getLineItemValue('custpage_sl_items', 'custpage_item', i);
                 objItemDetails.qty = parseInt(request.getLineItemValue('custpage_sl_items', 'custpage_qty', i));

                 arrLineDetails.push(objItemDetails);
             }
         }

         var recTransferOrder = nlapiCreateRecord('transferorder');
         recTransferOrder.setFieldValue('shipdate', SHIP_DATE);

         var LOCATION_CENTRAL_WAREHOUSE = '1';
         recTransferOrder.setFieldValue('location', TO_LOCATION);
         //recTransferOrder.setFieldValue('location', LOCATION_CENTRAL_WAREHOUSE);

         var STATUS_PENDING_APPROVAL = 'A';
         recTransferOrder.setFieldValue('orderstatus', STATUS_PENDING_APPROVAL);

         var TRAN_DATE = nlapiDateToString(new Date(), 'date');
         recTransferOrder.setFieldValue('trandate', TRAN_DATE);

         recTransferOrder.setFieldValue('transferlocation', request.getParameter('custpage_lcb_location'));

         //add each line item to the transaction
         for (var i = 0; i < arrLineDetails.length; i++) {
             var objItemDetails = arrLineDetails[i];

             recTransferOrder.selectNewLineItem('item');
             recTransferOrder.setCurrentLineItemValue('item', 'item', objItemDetails.item);
             recTransferOrder.setCurrentLineItemValue('item', 'quantity', objItemDetails.qty);
             recTransferOrder.commitLineItem('item');
         }

         var stTransferOrderId = nlapiSubmitRecord(recTransferOrder, false, true);
         nlapiLogExecution('DEBUG', LOG_TITLE, 'Create Transfer Order ID: ' + stTransferOrderId);

         var _SUCCESSFORM = nlapiCreateForm('Created Transfer Order Status');
         var arrMsg = [];

         if (stTransferOrderId) {
             var stURL = nlapiResolveURL('RECORD', 'transferorder', stTransferOrderId);
             var stTranId = nlapiLookupField('transferorder', stTransferOrderId, 'tranid');

             arrMsg.push('The following Transfer Order transaction has been created:');
             arrMsg.push('<a href="' + stURL + '" target="_blank">Transfer Order #' + stTranId + '</a>');

             _SUCCESSFORM.addField('custpage_transferorder_link', 'inlinehtml', '').setDefaultValue(confirmationText(arrMsg.join('<br />')));
         }

         return _SUCCESSFORM;
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

function confirmationText(details) {
    if (details) {
        var stConfirmation = '<div width="100%" class="uir-alert-box confirmation session_confirmation_alert" style=""><div class="icon confirmation"><img alt="" src="/images/icons/messagebox/icon_msgbox_confirmation.png"></div><div class="content"><div class="title">Confirmation</div><div class="descr">{0}</div></div></div>'.format(details);

        return stConfirmation;
    }
    return '';
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

function inArray(val, arr) {
    var bIsValueFound = false;

    for (var i = 0; i < arr.length; i++) {
        if (val == arr[i]) {
            bIsValueFound = true;
            break;
        }
    }

    return bIsValueFound;
}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

function getItemRecord(arrFilters, arrColumns) {
    var logTitle = 'getCoursIDS';
    var stCourseIDs = '';
    try {
        var arrTransactions = nlapiSearchRecord('customrecord_rtf_course', null, arrFilters, arrColumns);
        if (isEmpty(arrTransactions) == false) {
            if (arrTransactions.length > 0) {
                if (isEmpty(arrTransactions) == false) {
                    for (cor in arrTransactions) {
                        stCourseIDs = stCourseIDs += (arrTransactions[cor].getValue('custrecord_rtf_courseid') + " - ");
                    }
                }
                return stCourseIDs;
            } else {
                throw nlapiCreateError('99999', 'Savesearch return more than 0 result');
            }
        }
        return null;
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('DEBUG', 'Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('DEBUG', 'Unexpected Error: ', error.toString());
            throw error;
        }
    }
}// JavaScript source code
