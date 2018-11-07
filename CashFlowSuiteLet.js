

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
 * @param {nlobjResponse} response Response objectnl
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
	

	var _SEARCHFORM = nlapiCreateForm('Search Item(s)');

	//buttons for choosing on how the searching for the items will execute
	_SEARCHFORM.addSubmitButton('Load Item(s)');

	//the search field for the item
	_SEARCHFORM.addField('custpage_lcb_from_date', 'date', 'From').setDisplayType('normal');
	_SEARCHFORM.addField('custpage_lcb_to_date', 'date', 'To').setDisplayType('normal');

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

	var _PROCESSFORM = nlapiCreateForm('Item(s) based on location');


	_PROCESSFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('PROCESS');
	
	//create the sublist to contain the result of the searching
	var sl_items = _PROCESSFORM.addSubList('custpage_sl_items', 'list', 'Items');

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

	sl_items.addMarkAllButtons();
	var arrProjected = [{ 'accounttype': 'projectedCF' }];
    //start search
	var arrBank = getBank(request);
	var arrItems = getReceivables(request);
	var arrPayables = getPayables(request);
	var arrCashNet = getNetReceivable(request);
	var arrNet = getNet(request);

	arrBank = arrBank.concat(arrItems);
	arrBank = arrBank.concat(arrPayables);
	arrBank = arrBank.concat(arrCashNet);
    arrBank = arrBank.concat(arrNet)
	nlapiLogExecution('DEBUG', LOG_TITLE, 'Items Search Results length: ' + arrItems.length);
	//var arrItems = [{ 'Startign Balance': 100 }, { 'Open Rec': 200 }, { 'Open Payables': 300 }, { 'projected cash flow': 100 }, { 'projected balance': 1000 }];


	 if (arrBank) {
		//assign values to line fields
	     for (var i = 0; i < arrBank.length; i++) {
	         nlapiLogExecution('DEBUG', LOG_TITLE, 'Item: ' + arrBank[i]);

	         sl_items.setLineItemValue('custpage_chkbox', (i + 1), 'F');
	         if (!isEmpty(arrBank[i].getText('accounttype', null, 'group'))) {
	             sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getText('accounttype', null, 'group'));
	         }
	         else if (arrBank[i].getValue('formulatext', null, 'group')=='Projected') {
	             sl_items.setLineItemValue('custpage_label', (i + 1), arrBank[i].getValue('formulatext', null, 'group'));
	         }
	         else if(arrBank[i].getValue('formulatext', null, 'group')=='Net Amount'){
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

	_PROCESSFORM.addSubmitButton('Create Transfer Order');
	_PROCESSFORM.addButton('Back', 'Back', 'history.go(-1);');

	return _PROCESSFORM;
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

	var stFromDate = request.getParameter('custpage_lcb_from_date');
	var stToDate = request.getParameter('custpage_lcb_to_date');
	//var stLocation = request.getParameter('custpage_lcb_location');
   //var stFromLocation = request.getParameter('custpage_lbc_from_location');
	var arrItems = [];

	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));
	//arrFilters.push(new nlobjSearchFilter('location', null, 'anyof', stLocation));
	//arrFilters.push(new nlobjSearchFilter('type', 'item', 'anyof', 'InvtPart'));
	//arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', SEARCHFILTER_INVOICE));

	var arrColumns = [];
	//arrColumns.push(new nlobjSearchColumn('item', null, 'group').setSort());
    //arrColumns.push(new nlobjSearchColumn('quantity', null, 'sum'));

	nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
//	nlapiLogExecution('DEBUG', 'search Criteria', 'location  ' + stLocation + 'tranType  ' + SEARCHFILTER_INVOICE);

	var arrTransactions = nlapiSearchRecord('transaction', 'customsearch83', arrFilters, arrColumns);

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

    var stFromDate = request.getParameter('custpage_lcb_from_date');
    var stToDate = request.getParameter('custpage_lcb_to_date');
  
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));
  
    var arrColumns = [];
    nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch84', arrFilters, arrColumns);
return arrTransactions;
}

function getBank(request) {
    var LOG_TITLE = 'getPayables';

    var stFromDate = request.getParameter('custpage_lcb_from_date');
    var stToDate = request.getParameter('custpage_lcb_to_date');

    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));

    var arrColumns = [];
    nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch85', arrFilters, arrColumns);
    return arrTransactions;
}

function getNet(request) {
    var LOG_TITLE = 'getPayables';

    var stFromDate = request.getParameter('custpage_lcb_from_date');
    var stToDate = request.getParameter('custpage_lcb_to_date');

    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));

    var arrColumns = [];
    nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch88', arrFilters, arrColumns);
    return arrTransactions;
}
function getNetReceivable(request) {
    var LOG_TITLE = 'getPayables';

    var stFromDate = request.getParameter('custpage_lcb_from_date');
    var stToDate = request.getParameter('custpage_lcb_to_date');

    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('trandate', null, 'within', [stFromDate, stToDate]));

    var arrColumns = [];
    nlapiLogExecution('DEBUG', 'search Criteria', 'Start date ' + stFromDate + 'endDate ' + stToDate);
    var arrTransactions = nlapiSearchRecord('transaction', 'customsearch87', arrFilters, arrColumns);
    return arrTransactions;
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
 		//recTransferOrder.setFieldValue('shipdate', SHIP_DATE);
 		recTransferOrder.setFieldValue('recTransferOrder', SHIP_DATE);

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
		//var arrColumns = new Array();
		//arrColumns.push(new nlobjSearchColumn('internalid'));
		//arrColumns.push(new nlobjSearchColumn('locationquantityonhand'));

		var locResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
		//add the columns here to get the quantities

		if (isEmpty(locResults) == false) {
			return locResults;
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
}
//rf to get quantity
function getFromQty(intid, recFrom) {
	var qOnHand = 0;
	for (res in recFrom) {
		if (intid == recFrom[res].getId()) {
			qOnHand = recFrom[res].getValue('locationquantityavailable');
			break;
		}
	}
	return qOnHand;
}
function getFromQtyOnOrder(intid, recFrom) {
	var qOnHand = 0;
	for (res in recFrom) {
		if (intid == recFrom[res].getId()) {
			qOnHand = recFrom[res].getValue('locationquantityonorder');
			break;
		}
	}
	return qOnHand;
}
