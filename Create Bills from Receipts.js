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
 * Version	Date			Author				Remarks
 * 1.0		29 Jan 2015		Lester Ochengco		Create Vendor Bill by Item Receipt
 * 1.1		24 Feb 2015		Lester Ochengco		Additional Features
 * 												- Vendor Search
 * 												- 3 columns (Vendor, Quantity, Rate)
 * 												- Single Vendor Bill
 * 1.2      25 Mar 2015     Lester Ochengco     Additional Features
 *  											- re-direct to the created vendor bill
 */

var LOGGER_TITLE = 'SS_createVBfromItemReciept';
// ACTION contains two values (BILL_ITEM_RECEIPT, SEARCH)
var ACTION = '';
var GENERATED_VENDOR_BILL_ID = '';

/**
 * (Automation 1) 
 * This function renders a list of all 'Pending Billing / Partially Received' purchase orders' item receipt.
 * Each selected item receipt will be create a vendor bill upon submission.  
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_loadCreateVendorBill(request, response) {
    try {
        nlapiLogExecution('DEBUG', LOGGER_TITLE, '>>Entry<<');

        ACTION = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', LOGGER_TITLE, '***** ' + ACTION + '  *****');

        // Instantiate form creation
        var objForm = nlapiCreateForm('Search Item Receipts');
        // Create field elements
        objForm.addField('custpage_itemreceipt_id', 'integer', 'Item Receipt');
        objForm.addField('custpage_purchaseorder_id', 'integer', 'Purchase Order');
        objForm.addField('custpage_vendor_id', 'select', 'Vendor', '-3'); // Record Type = Vendor (-3) Internal Id
        objForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('BILL_ITEM_RECEIPT');

        // Create Search Result Subtab
        var objSubTab = objForm.addTab('custpage_result_tab', 'Search Result');

        // Create Sublist
        var objItemReceiptsSublist = objForm.addSubList('custpage_item_receipts', 'list', 'Item Receipts', 'custpage_result_tab');

        // Set item fields
        objItemReceiptsSublist.addField('custpage_selected', 'checkbox', 'Selected');
        objItemReceiptsSublist.addField('custpage_item_receipt_internalid', 'text', 'Internal Id').setDisplayType('hidden');
        objItemReceiptsSublist.addField('custpage_item_receiptid', 'text', 'Item Receipt');
        objItemReceiptsSublist.addField('custpage_po_transid', 'text', 'Purchase Order');
        objItemReceiptsSublist.addField('custpage_po_vendorname', 'text', 'Vendor');
        objItemReceiptsSublist.addField('custpage_po_total_qty', 'text', 'Quantity');
        objItemReceiptsSublist.addField('custpage_po_total_amount', 'text', 'Amount');
        objItemReceiptsSublist.addField('custpage_po_internalid', 'text', 'Purchase Order Internal Id').setDisplayType('hidden');

        // Create button in for filter submit
        objForm.addButton('custombuttom_search', 'Search', 'nlapiSetFieldValue(\'custpage_action\', \'SEARCH\'); window.ischanged = false; document.forms[0].submit();');
        // Create button to refresh/empty all fields
        objForm.addResetButton('Reset');
        // Create button to Bill selected item receipts
        objForm.addSubmitButton('Bill Item Receipts');

        // Creating a vendor bill from the selected item receipts upon user submit
        var arrBilledItemReceipt = createVBfromItemReciept(request);

        var objMessageBox = objForm.addField('custpage_msg_box', 'inlinehtml');
        // Display billed item receipts on submit
        showMessageNotify(objMessageBox, arrBilledItemReceipt, request);

        // Get all Pending Billable Item Receipts
        var arrPurchaseOrders = searchPendBillPartRecPurchaseOrder(request);

        nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Total Purchase Order = ' + arrPurchaseOrders.length);

        // Show All Item Receipts
        displaySearchResults(request, arrPurchaseOrders, objItemReceiptsSublist);

        // Render the page content
        response.writePage(objForm);

        nlapiLogExecution('DEBUG', LOGGER_TITLE, '>>Exit<<');
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}


/**
 * (Automation 1)
 * This function fetch all PO with a status of 'Pending Billing / Partially Received'
 * 
 * @param request (object)
 * @returns arrSearchResults (array)
 */
function searchPendBillPartRecPurchaseOrder(request) {
    /* Declare search filters
	 * - PurchOrd:E = Purchase Order:Pending Billing/Partially Received
	 * - PurchOrd:F = Purchase Order:Pending Bill
	 * - Get only the parent field record from the PO value
	 */
    var arrSearchFilters = [new nlobjSearchFilter('status', null, 'anyof', ['PurchOrd:E', 'PurchOrd:F']),
							 new nlobjSearchFilter('mainline', null, 'is', 'T')
    ];

    // Declare search columns
    var arrSearchColumns = [new nlobjSearchColumn('tranid')];


    if (ACTION == 'SEARCH') {
        var intPurchaseOrderId = request.getParameter('custpage_purchaseorder_id');
        var intVendorId = request.getParameter('custpage_vendor_id');

        // Adding filter for the purchase order Id if it is set
        if (!isEmpty(intPurchaseOrderId)) {
            arrSearchFilters.push(new nlobjSearchFilter('tranid', null, 'is', intPurchaseOrderId));
        }

        if (!isEmpty(intVendorId)) {
            arrSearchFilters.push(new nlobjSearchFilter('name', null, 'anyof', intVendorId));
        }
    }

    // Get Purchase Order Record
    var arrSearchResults = searchAllRecord('purchaseorder', null, arrSearchFilters, arrSearchColumns);

    return (arrSearchResults);
}

/**
 * (Automation 1)
 * This function populates the search result containing a list of Item Receipts
 * 
 * @param request (object) Used to get the submitted action
 * @param arrPurchaseOrders (array) Contains the search result
 * @param objItemReceiptsSublist (object) Used to add the result in the form
 */
function displaySearchResults(request, arrPurchaseOrders, objItemReceiptsSublist) {
    var intRowCount = 1;
    var objPurchaseOrderRec = '';
    var intCurrentPurchaseOrderRec = '';

    // Looping Searched Item Receipts
    for (var intPOKey = 0; intPOKey < arrPurchaseOrders.length; intPOKey++) {
        var objPurchaseOrder = arrPurchaseOrders[intPOKey];

        // This prevents too much server request
        if (objPurchaseOrderRec == '' || intCurrentPurchaseOrderRec != objPurchaseOrder.getId()) {
            // Load Purchase Order Record
            objPurchaseOrderRec = nlapiLoadRecord('purchaseorder', objPurchaseOrder.getId());
            intCurrentPurchaseOrderRec = objPurchaseOrder.getId();
        }

        // Purchase Order Internal Id and Transaction Id
        var intPOInternalId = objPurchaseOrder.getId();
        var intPOTransId = objPurchaseOrder.getValue('tranid');
        // Item Receipt Count and IDs
        var intItemReceiptItemCountLinks = objPurchaseOrderRec.getLineItemCount('links');

        // Looping Item Receipt Records
        for (var intItemReceiptKey = 1; intItemReceiptKey <= intItemReceiptItemCountLinks; intItemReceiptKey++) {
            var stVendorName = objPurchaseOrderRec.getFieldText('entity');
            var intItemReceiptId = objPurchaseOrderRec.getLineItemValue('links', 'id', intItemReceiptKey);
            var intItemReceiptTransId = objPurchaseOrderRec.getLineItemValue('links', 'tranid', intItemReceiptKey);
            var intItemReceiptTypeId = objPurchaseOrderRec.getLineItemValue('links', 'type', intItemReceiptKey);

            // Filtering Item Receipts with 'Item Receipt' link type AND not yet billed
            if (intItemReceiptTypeId == 'Item Receipt' && ACTION == 'SEARCH') {
                var intParamItemReceiptId = request.getParameter('custpage_itemreceipt_id');
                var intParamPurchaseOrderId = request.getParameter('custpage_purchaseorder_id');
                var intParamVendorId = request.getParameter('custpage_vendor_id');

                // Show record matching the Item Receipt id/ Display records if Item Receipt Search Filter is empty
                if ((!isEmpty(intParamItemReceiptId) && intParamItemReceiptId == intItemReceiptTransId) || !isEmpty(intParamPurchaseOrderId) || !isEmpty(intParamVendorId)) {
                    var objItemReceipt = checkBillableItemReceipt(objPurchaseOrderRec, intItemReceiptId);

                    if (objItemReceipt.isBillableItemReceipt == true) {
                        objItemReceiptsSublist.setLineItemValue('custpage_selected', intRowCount, 'F');
                        objItemReceiptsSublist.setLineItemValue('custpage_item_receipt_internalid', intRowCount, intItemReceiptId);
                        objItemReceiptsSublist.setLineItemValue('custpage_item_receiptid', intRowCount, intItemReceiptTransId);
                        objItemReceiptsSublist.setLineItemValue('custpage_po_transid', intRowCount, intPOTransId);
                        objItemReceiptsSublist.setLineItemValue('custpage_po_internalid', intRowCount, intPOInternalId);
                        objItemReceiptsSublist.setLineItemValue('custpage_po_vendorname', intRowCount, stVendorName);
                        objItemReceiptsSublist.setLineItemValue('custpage_po_total_qty', intRowCount, objItemReceipt.totalQuantity);
                        objItemReceiptsSublist.setLineItemValue('custpage_po_total_amount', intRowCount, objItemReceipt.totalAmount);

                        nlapiLogExecution('DEBUG', LOGGER_TITLE, '- Set Values -'
								+ '\n <br> Row = #' + intRowCount
								+ '\n <br> PO Internal Value = ' + intPOInternalId
								+ '\n <br> Purchase Order Trans ID = ' + intPOTransId
								+ '\n <br> Item Receipt Id= ' + intItemReceiptId
								+ '\n <br> Item Receipt Trans ID = ' + intItemReceiptTransId
								+ '\n <br> Vendor Name = ' + stVendorName
								+ '\n <br> Total Quantity = ' + objItemReceipt.totalQuantity
								+ '\n <br> Total Amount = ' + objItemReceipt.totalAmount
							);

                        intRowCount += 1;
                    }
                }
            }
        }
    }
}
/**
 * (Automation 2)
 * This function creates a vendor bill based on the selected item receipt.
 * 
 * @param request
 * @return arrBilledItemReceipts (array)
 */
function createVBfromItemReciept(request) {
    try {
        if (ACTION == 'BILL_ITEM_RECEIPT') {
            // Count selected item receipts
            var intLineItemCount = request.getLineItemCount('custpage_item_receipts');

            nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Total Line Item to Bill: ' + intLineItemCount);

            // List of all billed item receipts to be displayed after submit
            var arrBilledItemReceipts = [];

            if (intLineItemCount > 0) {
                var arrPurchaseOrderIds = [];
                var arrItemReceiptsIds = []; // used to link item receipts to each line items of vendor bill
                var arrItemReceiptsTranIds = []; // used to link item receipts to each line items of vendor bill
                var arrItemReceiptsDetails = [];
                var objReceivedItemReceipts = {}; // used to link item receipts to each line items of vendor bill
                var arrItemReceiptTotals = {};
                var arrOrderlineItemsToBill = [];

                // Looping Selected Item Receipt
                for (var intLineItemCtr = 1; intLineItemCtr <= intLineItemCount; intLineItemCtr++) {
                    var bIsSelected = request.getLineItemValue('custpage_item_receipts', 'custpage_selected', intLineItemCtr);
                    var intItemReceiptInternalId = request.getLineItemValue('custpage_item_receipts', 'custpage_item_receipt_internalid', intLineItemCtr);
                    var intItemReceiptTransId = request.getLineItemValue('custpage_item_receipts', 'custpage_item_receiptid', intLineItemCtr);
                    var intPOInternalId = request.getLineItemValue('custpage_item_receipts', 'custpage_po_internalid', intLineItemCtr);
                    var intPOTransId = request.getLineItemValue('custpage_item_receipts', 'custpage_po_transid', intLineItemCtr);

                    if (bIsSelected == 'T') {
                        nlapiLogExecution('DEBUG', LOGGER_TITLE, '- Selected Line Item to Bill -'
								+ '\n <br> Row = #' + intLineItemCtr
								+ '\n <br> PO Internal Value = ' + intPOInternalId
								+ '\n <br> Purchase Order Trans ID = ' + intPOTransId
								+ '\n <br> Item Receipt Id= ' + intItemReceiptInternalId
								+ '\n <br> Item Receipt Trans ID = ' + intItemReceiptTransId
						);

                        // This prevents duplicates
                        if (arrPurchaseOrderIds.indexOf(intPOInternalId) == -1) {
                            arrPurchaseOrderIds.push(intPOInternalId);
                        }

                        var objItems = {};
                        objItems.poid = intPOInternalId;
                        objItems.itemreceiptid = intItemReceiptInternalId;
                        objItems.itemreceipttranid = intItemReceiptTransId;
                        // PO Internal Id, Item Receipt Internal Id, Item Receipt Trans Id
                        arrItemReceiptsDetails.push(objItems);
                        arrItemReceiptsTranIds.push(intItemReceiptTransId);
                        arrItemReceiptsIds.push(intItemReceiptInternalId);
                    }
                }

                // Added arrMergedUnsavedVendorBill
                var arrMergedUnsavedVendorBill = [];

                // Looping Purchase Orders
                for (var intPurchOrdKey = 0; intPurchOrdKey < arrPurchaseOrderIds.length; intPurchOrdKey++) {
                    var intPOInternalId = arrPurchaseOrderIds[intPurchOrdKey];
                    var objVendorBillRecord = nlapiTransformRecord('purchaseorder', intPOInternalId, 'vendorbill');

                    // Loop selected item receipts - This is to get the total quantity of each orderline items
                    for (var intSelectedItemReceiptKey = 0; intSelectedItemReceiptKey < arrItemReceiptsDetails.length; intSelectedItemReceiptKey++) {
                        var intPOInternalIDFromSelectedItemReceipt = arrItemReceiptsDetails[intSelectedItemReceiptKey].poid; // PO Internal Id

                        // Filter only those item receipts with the same PO
                        if (intPOInternalId == intPOInternalIDFromSelectedItemReceipt) {
                            var intItemReceiptInternalId = arrItemReceiptsDetails[intSelectedItemReceiptKey].itemreceiptid; // Item Receipt Internal Id
                            var intItemReceiptTransIDFromSelectedItemReceipt = arrItemReceiptsDetails[intSelectedItemReceiptKey].itemreceipttranid; // Item Receipt Transaction Id

                            if (arrBilledItemReceipts.indexOf(intItemReceiptTransIDFromSelectedItemReceipt) == -1) {
                                // Collect all Billed Item Receipts
                                arrBilledItemReceipts.push(intItemReceiptTransIDFromSelectedItemReceipt);
                            }

                            var objItemReceiptRec = nlapiLoadRecord('itemreceipt', intItemReceiptInternalId);

                            nlapiLogExecution('DEBUG', LOGGER_TITLE, 'PO Internal ID = ' + intPOInternalIDFromSelectedItemReceipt
									+ '\n <br />  Item Receipt Internal ID = ' + intItemReceiptInternalId);

                            // Loop Item Receipt Items
                            for (var intToBillLineItem = 1; intToBillLineItem <= objItemReceiptRec.getLineItemCount('item') ; intToBillLineItem++) {
                                var intItemReceiptLineItemOrderLine = objItemReceiptRec.getLineItemValue('item', 'orderline', intToBillLineItem);
                                var intItemReceiptLineItemQuantity = objItemReceiptRec.getLineItemValue('item', 'quantity', intToBillLineItem);

                                if (arrOrderlineItemsToBill.indexOf(intItemReceiptLineItemOrderLine) == -1) {
                                    // Collect all Billed Item Receipts
                                    arrOrderlineItemsToBill.push(intItemReceiptLineItemOrderLine);
                                }

                                // Collecting item receipts for each vendor bill line items
                                var stReceivedItemReceiptKey = intPOInternalIDFromSelectedItemReceipt + ':' + intItemReceiptLineItemOrderLine;
                                objReceivedItemReceipts[stReceivedItemReceiptKey] = stReceivedItemReceiptKey in objReceivedItemReceipts ? objReceivedItemReceipts[stReceivedItemReceiptKey] + ', ' + intItemReceiptTransIDFromSelectedItemReceipt : intItemReceiptTransIDFromSelectedItemReceipt;

                                // Calculating the total quantity for each orderline
                                arrItemReceiptTotals[intItemReceiptLineItemOrderLine] = isEmpty(arrItemReceiptTotals[intItemReceiptLineItemOrderLine]) ? intItemReceiptLineItemQuantity : parseInt(arrItemReceiptTotals[intItemReceiptLineItemOrderLine]) + parseInt(intItemReceiptLineItemQuantity);

                                nlapiLogExecution('DEBUG', LOGGER_TITLE, 'PO Internal ID = ' + intPOInternalIDFromSelectedItemReceipt
										+ '\n <br />  Item Receipt Internal ID = ' + intItemReceiptInternalId
										+ '\n <br />  Item Receipt Orderline = ' + intItemReceiptLineItemOrderLine
										+ '\n <br />  Item Receipt Quantity = ' + intItemReceiptLineItemQuantity
										+ '\n <br /> Total Quantity = ' + arrItemReceiptTotals[intItemReceiptLineItemOrderLine]
										+ '\n <br /> Generated Key - Item Receipts  = ' + stReceivedItemReceiptKey
								);
                            }
                        }
                    }

                    var intTotalLineItemVendorBill = objVendorBillRecord.getLineItemCount('item');
                    nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Total Vendor Bill Line Item Count = ' + intTotalLineItemVendorBill);

                    // Loop Vendor Bill Line Item 
                    for (var intVendLineItem = 1; intVendLineItem <= intTotalLineItemVendorBill; intVendLineItem++) {
                        var intVendBillLineItemOrderLine = objVendorBillRecord.getLineItemValue('item', 'orderline', intVendLineItem);
                        var intVendBillLineItemQuantity = objVendorBillRecord.getLineItemValue('item', 'quantity', intVendLineItem);

                        var intTotalQuantityItemReceipt = arrItemReceiptTotals[intVendBillLineItemOrderLine];

                        // Use the quantity from the item receipt if it is less than the vendor bill
                        if (parseInt(intVendBillLineItemQuantity) > parseInt(intTotalQuantityItemReceipt)) {
                            objVendorBillRecord.setLineItemValue('item', 'quantity', intVendLineItem, intTotalQuantityItemReceipt);
                            nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Set new quantity = ' + intTotalQuantityItemReceipt
									+ '\n <br /> Quantity previous value = ' + intVendBillLineItemQuantity);
                        }

                        // Removal of line items that are not included
                        if (arrOrderlineItemsToBill.indexOf(intVendBillLineItemOrderLine) == -1) {
                            objVendorBillRecord.removeLineItem('item', intVendLineItem);
                            // intVendLineItem = intVendLineItem == 1 ? intVendLineItem: intVendLineItem - 1; // step back 1 line after the removal of 1 line item
                            intVendLineItem -= 1; // step back 1 line after the removal of 1 line item
                            intTotalLineItemVendorBill = objVendorBillRecord.getLineItemCount('item'); // update total items
                        }
                    }

                    // Collecting Pre-saved vendor bills
                    arrMergedUnsavedVendorBill.push(objVendorBillRecord);
                }

                nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Creating Vendor Bill...');
                // Create new vendor bill
                var recVendorBill = nlapiCreateRecord('vendorbill', { recordmode: 'dynamic' });

                // loop Prepared Purchase Orders Items 
                for (var i = 0; i < arrMergedUnsavedVendorBill.length; i++) {
                    var recPurchaseOrder = arrMergedUnsavedVendorBill[i];
                    var intVendorInternalId = recPurchaseOrder.getFieldValue('entity');
                    var intPOInternalId = recPurchaseOrder.getFieldValue('podocnum'); // used to set orderdoc
                    var intDepartmentId = recPurchaseOrder.getFieldValue('department');
                    var intClassId = recPurchaseOrder.getFieldValue('class');
                    var intLocationId = recPurchaseOrder.getFieldValue('location');

                    recVendorBill.setFieldValue('entity', intVendorInternalId);
                    recVendorBill.setFieldValue('department', intDepartmentId);
                    recVendorBill.setFieldValue('class', intClassId);
                    recVendorBill.setFieldValue('location', intLocationId);

                    nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Set vendor id = ' + intVendorInternalId
							+ '\n <br /> Department Id = ' + intDepartmentId
							+ '\n <br /> Class Id = ' + intClassId
							+ '\n <br /> Location Id = ' + intLocationId);

                    // loop PO line items
                    for (var j = 1; j <= recPurchaseOrder.getLineItemCount('item') ; j++) {
                        var intItemInternalId = recPurchaseOrder.getLineItemValue('item', 'item', j);
                        var intItemQuantity = recPurchaseOrder.getLineItemValue('item', 'quantity', j);
                        var intOrderline = recPurchaseOrder.getLineItemValue('item', 'line', j);

                        // add line item
                        recVendorBill.selectNewLineItem('item');
                        recVendorBill.setCurrentLineItemValue('item', 'item', intItemInternalId);
                        recVendorBill.setCurrentLineItemValue('item', 'quantity', intItemQuantity);
                        recVendorBill.setCurrentLineItemValue('item', 'orderline', intOrderline);
                        recVendorBill.setCurrentLineItemValue('item', 'orderdoc', intPOInternalId);
                        // recVendorBill.setCurrentLineItemValue('item', 'billreceipts', arrItemReceiptsIds); // Not Supported - Populate multiselect column field 
                        // recVendorBill.setCurrentLineItemValue('item', 'custcol_received_num', arrItemReceiptsTranIds.toString());
                        // recVendorBill.setCurrentLineItemValue('item', 'custcol_received_num', objReceivedItemReceipts[intPOInternalId + ':' + intOrderline]); // working
                        recVendorBill.commitLineItem('item');

                        nlapiLogExecution('DEBUG', LOGGER_TITLE, '- Adding item -'
								+ '\n <br /> Item Id = ' + intItemInternalId
								+ '\n <br /> Quantity = ' + intItemQuantity
								+ '\n <br /> Orderline = ' + intOrderline
								+ '\n <br /> Orderdoc/PO Id = ' + intPOInternalId
								+ '\n <br /> Bill Receipts Id = ' + arrItemReceiptsIds.toString()
								+ '\n <br /> Bill Receipts Trans Id = ' + arrItemReceiptsTranIds.toString()
								);
                    }
                }

                nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Saving Vendor Bill...');
                var intVendorBillId = nlapiSubmitRecord(recVendorBill, true, true);
                nlapiLogExecution('AUDIT', LOGGER_TITLE, 'Vendor bill Record successfully saved. ID = ' + intVendorBillId);

                GENERATED_VENDOR_BILL_ID = intVendorBillId;

                return arrBilledItemReceipts;
            }
            else {
                nlapiLogExecution('DEBUG', LOGGER_TITLE, 'No Selected Item Receipt Found.');
            }
        }
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

}

/**
 * This function used in listing all remaining billable item receipts. 
 * It checks Item receipt containing at least 1 billable line item 
 * 
 * @param objPurchaseOrderRec
 * @param intItemReceiptId
 * @returns {Object}
 */
function checkBillableItemReceipt(objPurchaseOrderRec, intItemReceiptId) {
    var intPOLineItemCount = objPurchaseOrderRec.getLineItemCount('item');
    var arrBillableLineItems = [];

    // Looping PO Line Items
    for (var intKey = 1; intKey <= intPOLineItemCount; intKey++) {
        var intPOLineItemQty = parseInt(objPurchaseOrderRec.getLineItemValue('item', 'quantity', intKey));
        var intPOLineItemBilledQty = parseInt(objPurchaseOrderRec.getLineItemValue('item', 'quantitybilled', intKey));
        var intPOLineItemReceivedQty = parseInt(objPurchaseOrderRec.getLineItemValue('item', 'quantityreceived', intKey));

        if (intPOLineItemBilledQty < intPOLineItemQty) {
            // Collect remaining billable line items
            arrBillableLineItems.push(objPurchaseOrderRec.getLineItemValue('item', 'line', intKey));
        }
    }

    var objParams = new Object();
    objParams.isBillableItemReceipt = false;
    objParams.totalAmount = 0;
    objParams.totalQuantity = 0;

    // Load Item Receipt Record
    var objItemReceiptRec = nlapiLoadRecord('itemreceipt', intItemReceiptId);
    var intItemReceiptLineItemCount = objItemReceiptRec.getLineItemCount('item');

    // Looping Item Receipt line items
    for (var intKey = 1; intKey <= intItemReceiptLineItemCount; intKey++) {
        var intItemReceiptOrderline = objItemReceiptRec.getLineItemValue('item', 'orderline', intKey);
        objParams.totalAmount += parseFloat(objItemReceiptRec.getLineItemValue('item', 'rate', intKey)) * parseInt(objItemReceiptRec.getLineItemValue('item', 'quantity', intKey));
        objParams.totalQuantity += parseInt(objItemReceiptRec.getLineItemValue('item', 'quantity', intKey));

        if (arrBillableLineItems.indexOf(intItemReceiptOrderline) >= 0) {
            objParams.isBillableItemReceipt = true;
        }
    }

    objParams.totalAmount = nlapiFormatCurrency(objParams.totalAmount);
    objParams.totalQuantity = objParams.totalQuantity.toString();

    nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Is Billable = ' + objParams.isBillableItemReceipt
			+ '\n <br> Total Amount = ' + objParams.totalAmount
			+ '\n <br> Total Quantity = ' + objParams.totalQuantity);

    return (objParams);
}

/**
 * This function fetch records more than 1000 data
 * 
 * @param recordType
 * @param searchId
 * @param searchFilter
 * @param searchColumns
 * @returns {Array}
 */
function searchAllRecord(recordType, searchId, searchFilter, searchColumns) {
    var arrSearchResults = [];
    var count = 1000, min = 0, max = 1000;

    var searchObj = false;

    if (searchId) {
        searchObj = nlapiLoadSearch(recordType, searchId);
        if (searchFilter) {
            searchObj.addFilters(searchFilter);
        }

        if (searchColumns) {
            searchObj.addColumns(searchColumns);
        }
    }
    else {
        searchObj = nlapiCreateSearch(recordType, searchFilter, searchColumns);
    }

    var rs = searchObj.runSearch();

    while (count == 1000) {
        var resultSet = rs.getResults(min, max);
        arrSearchResults = arrSearchResults.concat(resultSet);
        min = max;
        max += 1000;
        count = resultSet.length;
    }

    if (arrSearchResults) {
        nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Total search results(' + recordType + '): ' + arrSearchResults.length);
    }

    return arrSearchResults;
}

/**
 * This function is used to create an html to notify the user listing all billed item receipts 
 * 
 * @param objMessageBox
 * @param arrBilledItemReceipt
 */
function showMessageNotify(objMessageBox, arrBilledItemReceipt, request) {
    var htmlMessageBox = '';
    var stVendorBillURL = nlapiResolveURL('tasklink', 'EDIT_TRAN_VENDBILL') + "?id=" + GENERATED_VENDOR_BILL_ID;

    // Prompt the user to fill up purchase order field
    if (ACTION == 'SEARCH'
		&& (isEmpty(request.getParameter('custpage_purchaseorder_id'))
			|| isEmpty(request.getParameter('custpage_vendor_id')))
		&& (isEmpty(request.getParameter('custpage_itemreceipt_id'))
			&& isEmpty(request.getParameter('custpage_purchaseorder_id'))
			&& isEmpty(request.getParameter('custpage_vendor_id')))) {
        var cssStyle = "style='border: 1px solid #8a6d3b; min-height: 32px; min-width: 32px; padding: 20px; background: none repeat scroll 0 0 #fcf8e3;'";

        htmlMessageBox = "<div id='custpage_msg_box_elem' " + cssStyle + " >"
					+ "<b>Please fill up the purchase order field or vendor field.</b>";

        htmlMessageBox += "</div>";
    }

    // Display all billed item receipts
    if (ACTION == 'BILL_ITEM_RECEIPT' && !isEmpty(arrBilledItemReceipt) && arrBilledItemReceipt != 0) {
        var cssStyle = "style='border: 1px solid #2acc14; min-height: 32px; min-width: 32px; padding: 20px; background: none repeat scroll 0 0 #d7fccf;'";

        htmlMessageBox = "<div id='custpage_msg_box_elem' " + cssStyle + " >"
					+ "<div><b>Generated Vendor Bill - <a href=" + stVendorBillURL + ">Click Here</a></b></div>"
					+ "<b>Billed Item Receipt(s):</b>"
					+ "<ul>";

        nlapiLogExecution('DEBUG', LOGGER_TITLE, 'Total billed item receipts ' + arrBilledItemReceipt.length);

        // Looping billed item receipts
        for (var keyInt = 0; keyInt < arrBilledItemReceipt.length; keyInt++) {
            htmlMessageBox += "	<li>#" + arrBilledItemReceipt[keyInt] + "</li>";
        }

        htmlMessageBox += "</ul>";
        htmlMessageBox += "</div>";
    }

    // Prompt the user that the selected item receipt must have been billed
    if (ACTION == 'BILL_ITEM_RECEIPT' && (isEmpty(arrBilledItemReceipt) || arrBilledItemReceipt == 0)) {
        var cssStyle = "style='border: 1px solid #8a6d3b; min-height: 32px; min-width: 32px; padding: 20px; background: none repeat scroll 0 0 #fcf8e3;'";

        htmlMessageBox = "<div id='custpage_msg_box_elem' " + cssStyle + " >"
					+ "<b>The purchase order line item might have been billed completely. Please check the line item(s) of the selected purchase order.</b>";

        htmlMessageBox += "</div>";

        nlapiLogExecution('DEBUG', LOGGER_TITLE, 'No item receipt selected');
    }

    objMessageBox.setDefaultValue(htmlMessageBox);
}

/**
 * Check if a string is empty
 * @param stValue (string) value to check
 * @returns {Boolean}
 */
function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}