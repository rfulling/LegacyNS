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
 *
 * ===================================================================
 * Developed for Right Stuf, Inc.
 *
 * Scheduled script will retrieve all open Sales Orders pending fulfillment
 * which have no authorization or have expired authorization.
 * This script will set those Orders to get authorization; and Orders failing
 * the CC authorization will be placed back to the "Pending Approval" queue.
 *
 * Version  Date              Author               Remarks
 * 1.00     2015 06 04 (Jun)  ccutib@netsuite.com  Initial script.
 * 1.10     2015 06 15 (Jun)  ccutib@netsuite.com  Added calculations for shipping and other charges for Orders in Pending Fulfillment.
 * 1.20     2015 06 27 (Jun)  mjpascual@netsuite.com  Added saved search filter (transaction number)
 * 1.30     2015 07 20 (Jul)  ccutib@netsuite.com  Optimized.
 * 
 */

var LOG_TITLE = 'main_authorizeCC_Orders';
var CONTEXT = nlapiGetContext();

function isEmpty(stValue) {
    return !stValue  || stValue.trim().length === 0;
}

/**
 * Returns true if val is a member of arr.
 * @param val - scalar value
 * @param arr - array of scalar values
 * @returns {Boolean} True if val is a member of arr.
 */
function inArray(val, arr) {
    var bIsValueFound = false, i, count;
    for (i = 0, count = arr.length; i < count; ++i) {
        if (val == arr[i]) {
            bIsValueFound = true
            break;
        }
    }
    return (bIsValueFound);
}

/**
 * Parses a string as a float or returns zero (0).
 * @param {String} s
 * @returns {Number}
 */
function parseFloatOrZero(s) {
    var num = 0;
    if (s) {
        num = parseFloat(s);
        if (!num || !isFinite(num) || isNaN(num)) {
            num = 0;
        }
    }
    return (num);
}


main_authorizeCC_Orders('type');

/**
 * This function consolidates all rows resulting from the search into a single array.
 *
 * @param {String} stRecordType
 * @param {String} stSearchID
 * @param {nlobjSearchFilter[]} arrSearchFilters
 * @param {nlobjSearchColumn[]} arrSearchColumns
 * @returns {Array}
 */
function searchRecords(stRecordType, stSearchID, arrSearchFilters, arrSearchColumns) {
    var DEBUG_IDENTIFIER = "searchRecords", arrSearchResults = [], count = 1000, min = 0, max = 1000, searchObj = null, resultSet, rs;
    try {
        if (stSearchID) {
            searchObj = nlapiLoadSearch(stRecordType, stSearchID);
            if (arrSearchFilters) {
                searchObj.addFilters(arrSearchFilters);
            }
            if (arrSearchColumns) {
                searchObj.addColumns(arrSearchColumns);
            }
        } else {
            searchObj = nlapiCreateSearch(stRecordType, arrSearchFilters, arrSearchColumns);
        }
        rs = searchObj.runSearch();
        while (count === 1000) {
            resultSet = rs.getResults(min, max);
            arrSearchResults = arrSearchResults.concat(resultSet);
            min = max;
            max += 1000;
            count = resultSet.length;
        }
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', DEBUG_IDENTIFIER + ': Process Error', error.getCode() + ': ' + error.getDetails());
        } else {
            nlapiLogExecution('ERROR', DEBUG_IDENTIFIER + ': Unexpected Error', error.toString());
        }
        throw error;
    }
    if (!arrSearchResults || !arrSearchResults.length) {
        arrSearchResults = null;
    }
    return (arrSearchResults);
}

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function main_authorizeCC_Orders(type) {
    try {
        nlapiLogExecution('DEBUG', LOG_TITLE, '>> Entering Script (Type: ' + 'type' + ') <<');
        // script params and constants
        var EVENTTYPE_AUTHREQUEST = 'Authorization Request',
			EVENTRESULT_ACCEPT = 'ACCEPT',
			FAILED_ORDER_STATUS = 'A', // pending approval
            /*
			EMAILSUBJECT = CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailsubj'),
			EMAILBODY = CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailbody'),
			EMAILAUTHOR = CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailauthor'),
			CREDIT_CARD_PROCESSOR = CONTEXT.getSetting('SCRIPT', 'custscript_creditcardprocessors'),
			SAVEDSEARCH_OPEN_ORDERS = CONTEXT.getSetting('SCRIPT', 'custscript_search_openorders'),
		    TRAN_ID = CONTEXT.getSetting('SCRIPT', 'custscript_internal_ids').toString();
            */
        EMAILSUBJECT = 'testdebut';//CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailsubj'),
        EMAILBODY = 'no body';//CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailbody'),
        EMAILAUTHOR = 'no authore';//CONTEXT.getSetting('SCRIPT', 'custscript_autherror_emailauthor'),
        CREDIT_CARD_PROCESSOR = 'Cybersource';//CONTEXT.getSetting('SCRIPT', 'custscript_creditcardprocessors'),
        SAVEDSEARCH_OPEN_ORDERS = 'customsearch_rsi_openordersforccreauth';// CONTEXT.getSetting('SCRIPT', 'custscript_search_openorders'),
        TRAN_ID = '661636';       //CONTEXT.getSetting('SCRIPT', 'custscript_internal_ids').toString();


        // script variables
        var arrAuthorizedOrders = [], // list of Orders to authorize
			mapOrderDetails = {},           // list of Order details
			arrProcessedOrders = [],   // list of processed Orders
			arrSalesOrdersToProcess = [], // list of Open Orders as JS Objects
			arrSalesOrderResults,     // list of Open Orders (@type nlobjSearchResult)
			boolIsCyberSource, // CC Processor is supported
			dtEventDt,     // payment event date
			dtLatestEvent, // payment event date - temporary holder
			dtToday,       // current date
			flDiff,        // no. of days since the payment event
			intEvent,       // payment event index 
			intEventsCount, // event count
			stCCProcessor, // Order CC Processor 
			stCustId,      // Order Customer
			stCustEmail,   // Order Customer email
			stEventDt,     // dtEventDt as NS formatted String
			stEventType,   // payment event type
			stOrderId,     // Order ID
			stPaymentEventResult, // payment event result post reauthorization
			stRemainingUnfulfilled, // remaining amount to fulfill
			stResult,    // payment event result pre reauthorization
			stSubmitted, // Order ID after reauthorization
			stStatus,    // Order status
			recOrder;    // the Order record
        // temporary holders
        var arr, // array
			intIndex, // index
			max, // length
			st;  // string
        /** @type nlobjSearchResult */
        var objResult,
			objOrder; // Open Order object
        // audit log
        nlapiLogExecution('AUDIT', LOG_TITLE, 'Script Parameters::' +
					'\n|Authorization Error Email: Subject = ' + EMAILSUBJECT +
					'\n|Authorization Error Email: Body = ' + EMAILBODY +
					'\n|Authorization Error Email: Author = ' + EMAILAUTHOR +
					'\n|Specific Credit Card Processors to Support = ' + CREDIT_CARD_PROCESSOR +
					'\n|Saved Search for Open Orders = ' + SAVEDSEARCH_OPEN_ORDERS +
					'\n|Transaction Id = ' + TRAN_ID);
        // check mandatory script parameters
        if (isEmpty(EMAILSUBJECT) || isEmpty(EMAILBODY) || isEmpty(EMAILAUTHOR) || isEmpty(SAVEDSEARCH_OPEN_ORDERS)) {
            throw nlapiCreateError('99999', CONTEXT.getScriptId() + ': Missing values for mandatory script parameter(s).');
        }
        CONTEXT = null;

        var arrInternalIds = [];

        if (TRAN_ID) {

            var arrTranIds = TRAN_ID.split('\r\n');
            nlapiLogExecution('DEBUG', LOG_TITLE, 'TRANSACTION LIST:' + 'arrTranIds   = ' + arrTranIds);

            for (var tranIdCtr = 0; tranIdCtr < arrTranIds.length ; tranIdCtr++) {
                var stInternalId = getInternalId(arrTranIds[tranIdCtr]);
                if (stInternalId) arrInternalIds.push(stInternalId);
            }

            nlapiLogExecution('DEBUG', LOG_TITLE, 'TRANSACTION LIST:' + 'arrInternalIds   = ' + arrInternalIds);
        }

        var filters = [];
        if (arrInternalIds.length) filters.push(new nlobjSearchFilter('internalid', null, 'anyof', TRAN_ID));

        // search all open sales orders
        arrSalesOrderResults = searchRecords('salesorder', SAVEDSEARCH_OPEN_ORDERS, filters);
        if (arrSalesOrderResults && arrSalesOrderResults.length) {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'Saved search returned ' + arrSalesOrderResults.length + ' result(s).');
            for (intIndex in arrSalesOrderResults) {
                objResult = arrSalesOrderResults[intIndex];
                stOrderId = objResult.getValue('internalid', null, 'group');
                if (inArray(stOrderId, arrProcessedOrders)) {
                    continue;
                }
                stStatus = objResult.getText('statusref', null, 'group');
                stCustEmail = objResult.getValue('email', 'customer', 'group');
                stRemainingUnfulfilled = objResult.getValue('formulanumeric', null, 'sum');
                stCCProcessor = objResult.getValue('merchantaccount', null, 'group');
                objOrder = {};
                objOrder.stOrderId = stOrderId;
                objOrder.stStatus = stStatus;
                objOrder.stCustEmail = stCustEmail;
                objOrder.stRemainingUnfulfilled = stRemainingUnfulfilled;
                objOrder.stCCProcessor = stCCProcessor;
                arrSalesOrdersToProcess.push(objOrder);
                arrProcessedOrders.push(stOrderId);
            }
        }
        arrSalesOrderResults = null;
        arrProcessedOrders = [];
        if (arrSalesOrdersToProcess && arrSalesOrdersToProcess.length) {
            for (var i = 0, count = arrSalesOrdersToProcess.length; i < count; ++i) {
                try {
                    objResult = arrSalesOrdersToProcess[i];
                    stOrderId = objResult.stOrderId;
                    stStatus = objResult.stStatus;
                    if (inArray(stOrderId, arrProcessedOrders)) {
                        continue;
                    }
                    stCustEmail = objResult.stCustEmail;
                    stRemainingUnfulfilled = objResult.stRemainingUnfulfilled;
                    stCCProcessor = objResult.stCCProcessor;
                    boolIsCyberSource = false;
                    if (!stCCProcessor || stCCProcessor === '- None -') {
                        boolIsCyberSource = true;
                    } else if (stCCProcessor && !isEmpty(CREDIT_CARD_PROCESSOR)) {
                        arr = CREDIT_CARD_PROCESSOR.trim().replace(/,[ ]*/g, ',').replace(/^[,]*|[,]*$/g, '').split(',');
                        if (arr && arr.length) {
                            for (intIndex = 0, max = arr.length; intIndex < max; intIndex += 1) {
                                if (stCCProcessor === arr[intIndex]) {
                                    boolIsCyberSource = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        boolIsCyberSource = true;
                    }
                    nlapiLogExecution('DEBUG', LOG_TITLE, 'LOADED ORDER:' +
							'\n|Internal ID = ' + stOrderId +
							'\n|CC Processor = ' + stCCProcessor +
							'\n|Customer = ' + stCustEmail);
                    if (boolIsCyberSource) {
                        // no authorization requests were found, flag for authorization
                        if (!inArray(stOrderId, arrAuthorizedOrders)) {
                            arrAuthorizedOrders.push(stOrderId);
                        }
                        mapOrderDetails[stOrderId] = { 'custemail': stCustEmail, 'authamount': stRemainingUnfulfilled };
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'No accepted payment events found.\nGet Authorization set to "T" for Order ' + stOrderId + ' with ' + stRemainingUnfulfilled + ' to fulfill.');
                    } else {
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'The credit card processor ' + stCCProcessor +
								' is not supported by the script. Please check the entry under the script parameters.');
                    }
                    arrProcessedOrders.push(stOrderId);
                } catch (error) {
                    if (error.getDetails != undefined) {
                        nlapiLogExecution('ERROR', LOG_TITLE + ': Process Error', error.getCode() + ': ' + error.getDetails());
                        throw error;
                    } else {
                        nlapiLogExecution('ERROR', LOG_TITLE + ': Unexpected Error', error.toString());
                        throw nlapiCreateError('99999', error.toString(), true);
                    }
                }
                // govern remaining usage
                if (nlapiGetContext().getRemainingUsage() <= 500) {
                    var stateMain = nlapiYieldScript();
                    if (stateMain.status == 'FAILURE') {
                        nlapiLogExecution('ERROR', LOG_TITLE, 'Failed to yield script (do-while: checking each Order payment event), exiting: Reason = ' + stateMain.reason + ' / Size ' + stateMain.size);
                        throw 'Failed to yield script';
                    } else if (stateMain.status == 'RESUME') {
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'Resuming script (do-while: checking each Order payment event) because of ' + stateMain.reason + '. Size ' + stateMain.size);
                    }
                }
            }
            if (arrAuthorizedOrders && arrAuthorizedOrders.length) {
                nlapiLogExecution('DEBUG', LOG_TITLE, arrAuthorizedOrders.length + ' Order(s) to authorize: ');
                st = arrAuthorizedOrders.join(', ');
                do {
                    nlapiLogExecution('DEBUG', LOG_TITLE, st.substr(0, 3000));
                    st = st.substr(3001);
                } while (st.length);
                st = "";
                for (intIndex in mapOrderDetails) {
                    st += intIndex + ", ";
                }
                nlapiLogExecution('DEBUG', LOG_TITLE, 'Check: ');
                do {
                    nlapiLogExecution('DEBUG', LOG_TITLE, st.substr(0, 3000));
                    st = st.substr(3001);
                } while (st.length);
            }
            // process all Open Orders found for reauthorization
            for (intIndex = 0, max = arrAuthorizedOrders.length; intIndex < max; intIndex += 1) {
                try {
                    stOrderId = arrAuthorizedOrders[intIndex];
                    recOrder = nlapiLoadRecord('salesorder', stOrderId);
                    stStatus = recOrder.getFieldValue('status');
                    stRemainingUnfulfilled = mapOrderDetails[stOrderId]['authamount'];
                    var flAmountToAuthorize = parseFloatOrZero(stRemainingUnfulfilled);
                    var flSalesTax = 0;
                    for (var i = 1, count = recOrder.getLineItemCount('item') ; i <= count; ++i) {
                        var flTaxRate = parseFloatOrZero(recOrder.getLineItemValue('item', 'taxrate1', i)) / 100;
                        var intQtyCommitted = recOrder.getLineItemValue('item', 'quantitycommitted', i) || 0;
                        if (intQtyCommitted > 0) {
                            var flRate = parseFloatOrZero(recOrder.getLineItemValue('item', 'rate', i));
                            flSalesTax += (flRate * intQtyCommitted * flTaxRate);
                        }
                    }
                    if (recOrder.getFieldValue('status') == 'Pending Fulfillment') {
                        var flHandlingCost = parseFloatOrZero(recOrder.getFieldValue('handlingcost'));
                        var flShippingCost = parseFloatOrZero(recOrder.getFieldValue('shippingcost'));
                        var flGiftCertificate = parseFloatOrZero(recOrder.getFieldValue('giftcertapplied'));
                        var flDiscountTotal = parseFloatOrZero(recOrder.getFieldValue('discounttotal'));
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'Order has no previous shipment:\n' +
								'|Order: ' + stOrderId +
								'|Committed Amount: ' + flAmountToAuthorize +
								'|Tax: ' + flSalesTax +
								'|Shipping: ' + flShippingCost +
								'|Handling: ' + flHandlingCost +
								'|Gift Cert: ' + flGiftCertificate +
								'|Discount: ' + flDiscountTotal);
                        flAmountToAuthorize = flAmountToAuthorize + flSalesTax +
							flHandlingCost + flShippingCost + flGiftCertificate + flDiscountTotal;
                        recOrder.setFieldValue('paymentsessionamount', flAmountToAuthorize);
                    } else {
                        flAmountToAuthorize = flAmountToAuthorize + flSalesTax;
                        recOrder.setFieldValue('paymentsessionamount', flAmountToAuthorize);
                    }
                    if (flAmountToAuthorize <= 0) {
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'The transaction total for the Order (ID: ' + stOrderId + ') is negative. No need to authorize.');
                        continue;
                    }
                  //  recOrder.setFieldValue('isrecurringpayment', 'F');
                  //  recOrder.setFieldValue('getauth', 'T');
                  //  stSubmitted = nlapiSubmitRecord(recOrder, true, true);
                    stPaymentEventResult = nlapiLookupField('salesorder', stSubmitted, 'paymenteventresult');
                    nlapiLogExecution('AUDIT', LOG_TITLE, 'Re-authorized order: ' + stSubmitted + '|\nResult: ' + stPaymentEventResult);
                    if (stPaymentEventResult.toUpperCase() !== EVENTRESULT_ACCEPT.toUpperCase()) {
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'CC Authorization error for Order ' + stOrderId + '.');
                        // authorization has failed
                        if (stStatus.toUpperCase() === 'PENDING FULFILLMENT') {
                          //  nlapiSubmitField('salesorder', stOrderId, 'orderstatus', FAILED_ORDER_STATUS);
                            nlapiLogExecution('AUDIT', LOG_TITLE, 'Order (ID: ' + stOrderId + ') status changed to "Pending Approval".');
                        } else {
                            nlapiLogExecution('ERROR', LOG_TITLE, "The Order (ID: " + stOrderId + ") has been partially processed and may not be reset to 'Pending Approval'.");
                        }
                        stCustId = recOrder.getFieldValue('entity');
                        stCustEmail = mapOrderDetails[stOrderId]['custemail'];
                        if (!isEmpty(stCustEmail) && !isEmpty(stCustId) && stCustEmail !== '- None -') {
                            nlapiSendEmail(EMAILAUTHOR, stCustId, EMAILSUBJECT, EMAILBODY, null, null, { 'transaction': stOrderId });
                            nlapiLogExecution('DEBUG', LOG_TITLE, 'Order (ID: ' + stOrderId + '): Email sent to Customer (' + stCustId + ') from Employee(' + EMAILAUTHOR + ')=' + EMAILSUBJECT + ':' + EMAILBODY);
                        } else {
                            nlapiLogExecution('DEBUG', LOG_TITLE, 'Customer has no email for Order ' + stOrderId + '. Can\'t send notification.');
                        }
                    }
                } catch (error) {
                    if (error.getDetails != undefined) {
                        nlapiLogExecution('ERROR', LOG_TITLE + ': Process Error', 'Order (ID: ' + stOrderId + '): ' + error.getCode() + ': ' + error.getDetails());
                    } else {
                        nlapiLogExecution('ERROR', LOG_TITLE + ': Unexpected Error', 'Order (ID: ' + stOrderId + '): ' + error.toString());
                    }
                }
                recOrder = null;
                // govern remaining usage
                if (nlapiGetContext().getRemainingUsage() <= 500) {
                    var stateMain = nlapiYieldScript();
                    if (stateMain.status == 'FAILURE') {
                        nlapiLogExecution('ERROR', LOG_TITLE, 'Failed to yield script (do-while: authorizing each Order payment event), exiting: Reason = ' + stateMain.reason + ' / Size ' + stateMain.size);
                        throw 'Failed to yield script';
                    } else if (stateMain.status == 'RESUME') {
                        nlapiLogExecution('DEBUG', LOG_TITLE, 'Resuming script (do-while: authorizing each Order payment event) because of ' + stateMain.reason + '. Size ' + stateMain.size);
                    }
                }
            }
        } else {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'Saved search returned ZERO results.');
        }
        nlapiLogExecution('DEBUG', LOG_TITLE, '<< Exiting Script >>');
    } catch (mainerror) {
        if (mainerror instanceof nlobjError) {
            nlapiLogExecution('ERROR', 'System Error', mainerror.getCode() + ': ' + mainerror.getDetails());
            throw mainerror;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', mainerror.toString());
            throw nlapiCreateError('99999', mainerror.toString());
        }
    }
}

function getInternalId(stTransactionNo) {
    var internalId = null;

    var filters = [];
    filters.push(new nlobjSearchFilter('type', null, 'anyof', "SalesOrd"));
    filters.push(new nlobjSearchFilter("transactionnumber", null, "is", stTransactionNo));
    filters.push(new nlobjSearchFilter("mainline", null, "is", "T"));

    var columns = [];
    columns.push(new nlobjSearchColumn('internalid'));

    var arrSearch = nlapiSearchRecord('salesorder', null, filters, columns);

    if (arrSearch) {
        internalId = arrSearch[0].getValue('internalid');
    }

    return internalId;
}