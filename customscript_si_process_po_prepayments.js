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
 **/

/**
 * Create VB and update PrePayment records
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 May 2016     gmanarang
 * 1.10       13 Jun 2016     gmanarang		Added item parameter to PO if not present
 * 1.20       20 Jul 2016     gmanarang		Incorporated updates on design
 * 1.30       09 Sep 2016     gmanarang		Issue #8 fix change in formula used for calculation
 *
 */

/**
* @NApiVersion 2.0
* @NScriptType MapReduceScript
*/
define(['N/search', 'N/record', 'N/runtime', 'N/error'],
    function (search, record, runtime, error) {
        function getInputData() {
            var stLogTitle = 'getInputData';
            try {
                /*
                 * Get Script parameters needed 
                 */
                log.debug({
                    title: stLogTitle,
                    details: '--ENTRY--'
                });
                var stParamSearchId = runtime.getCurrentScript().getParameter({ name: 'custscript_si_po_si_prepayment' });
                log.debug({
                    title: stLogTitle,
                    details: 'Search: ' + stParamSearchId
                });

                if (!stParamSearchId) {
                    throw 'Missing script parameter: Saved Search';
                }

                // search and return records to process
                return search.load({ id: stParamSearchId });
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }
        /*
         * Map PO and SI PrePayment Records 
         */
        function map(context) {
            var stLogTitle = 'map';
            try {
                log.debug({
                    title: stLogTitle,
                    details: context.value
                });
                var searchResult = JSON.parse(context.value);
                /*
                 * Get desired input columns
                 */
                var stPONumber = searchResult.values["GROUP(transactionnumber)"];
                var stPOId = searchResult.values["GROUP(internalid)"].value;
                var stSIPPId = searchResult.values["GROUP(internalid.CUSTRECORD_SI_PREPAY_PO)"].value;

                log.debug({
                    title: stLogTitle,
                    details: 'PO #: ' + stPONumber
                    + ' | PO internal id: ' + stPOId
                    + ' | SI Prepayment internal id: ' + stSIPPId
                });

                context.write(stPOId, stSIPPId);
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }
        /*
         * Process all PrePayments for a unique PO
         */
        function reduce(context) {
            var stLogTitle = 'reduce';
            try {
                var stPOId = context.key;

                log.debug({
                    title: stLogTitle,
                    details: 'PO: ' + stPOId
                });

                log.debug({
                    title: stLogTitle,
                    details: 'values: ' + JSON.stringify(context.values)
                });

                var stParamItemId = runtime.getCurrentScript().getParameter({ name: 'custscript_si_vb_item' });
                if (!stParamItemId) {
                    throw 'Missing script parameter: VB Item';
                }

                // Load purchase order record
                var objRecPO = record.load({
                    type: 'purchaseorder',
                    id: stPOId,
                    isDynamic: true
                });

                // Get Eligible amount
                var flEligibleAmount = 0;

                flEligibleAmount = getEligibleAmount(objRecPO, 'item', flEligibleAmount);
                flEligibleAmount = getEligibleAmount(objRecPO, 'expense', flEligibleAmount);

                var stPad = '00'; // string length to left-pad zeroes
                var intSIPrePayLength = context.values.length;

                for (var intIdx = 0, intSeq = 1; intIdx < intSIPrePayLength; intIdx++ , intSeq++) {
                    /*
                     * Pad 0 to left
                     * --Replaced sequence to internal Id in order to be unique 
                     */
                    var stNum = intSeq.toString();
                    var stSequence = stPad.substring(0, stPad.length - stNum.length) + stNum;
                    log.debug({
                        title: stLogTitle,
                        details: 'Loop tag: ' + stSequence
                    });

                    var stSIPPId = context.values[intIdx];
                    /*
                     * call function to process results
                     */
                    processResult(stPOId, stSIPPId, stSIPPId, stParamItemId, flEligibleAmount); // stSequence); // if sequential.. 
                }

                context.write('processed', intSIPrePayLength);
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }
        /*
         * Get Execution summary details
         */
        function summarize(summary) {
            var stLogTitle = 'summarize';
            try {
                var seconds = summary.seconds;
                var intProcessed = 0;
                /*
                 * Get total processed
                 */
                summary.output.iterator().each(function (key, value) {
                    if (key == 'processed') {
                        intProcessed += forceParseInt(value);
                    }
                    return true;
                });
                log.debug({
                    title: stLogTitle,
                    details: 'Processed: ' + intProcessed
                });
                log.debug({
                    title: stLogTitle,
                    details: 'Elapsed time in seconds: ' + seconds
                });

                handleErrorIfAny(summary);

                log.debug({
                    title: stLogTitle,
                    details: '--COMPLETED--'
                });
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }

        /*
         * Error logging for map reduce
         */
        function handleErrorIfAny(summary) {
            var mapSummary = summary.mapSummary;
            var reduceSummary = summary.reduceSummary;

            handleErrorInStage('map', mapSummary);
            handleErrorInStage('reduce', reduceSummary);
        }

        function handleErrorInStage(stage, summary) {
            var errorMsg = [];
            summary.errors.iterator().each(function (key, value) {
                var msg = 'Error Key: ' + key + '. Detail: ' + JSON.parse(value).message + '\n';
                errorMsg.push(msg);
                return true;
            });

            if (errorMsg.length > 0) {
                log.error({
                    title: stage,
                    details: JSON.stringify(errorMsg)
                });
            }
        }

        /*
         * Function to create VB and update Prepayment Record 
         */
        function processResult(stPOId, stSIPPId, stSequence, stParamItemId, flEligibleAmount) {
            var stLogTitle = 'processResult';
            try {
                var stEligibleAmount = flEligibleAmount.toFixed(2);
                log.debug({
                    title: stLogTitle,
                    details: 'PO Id: ' + stPOId + ' | Total Eligible Amount: ' + stEligibleAmount
                });

                /*
                 * Create Vendor Bill
                 */
                var objRecVB = record.transform({
                    fromType: 'purchaseorder',
                    fromId: stPOId,
                    toType: 'vendorbill',
                    isDynamic: true
                });

                var intIdx = objRecVB.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: stParamItemId
                });
                // reload PO to be updated 
                var objRecPO = record.load({
                    type: 'purchaseorder',
                    id: stPOId,
                    isDynamic: true
                });
                if (intIdx < 0) {
                    updatePOLineItems(objRecPO, stParamItemId);

                    /*
                     * Create Vendor Bill
                     */
                    objRecVB = record.transform({
                        fromType: 'purchaseorder',
                        fromId: stPOId,
                        toType: 'vendorbill',
                        isDynamic: true
                    });

                    intIdx = objRecVB.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: stParamItemId
                    });

                    if (intIdx < 0) {
                        throw 'Item still not present in after PO update then transform.';
                    }
                }

                var stPONumber = objRecPO.getValue({ fieldId: 'tranid' });
                log.debug({
                    title: stLogTitle,
                    details: 'PO #: ' + stPONumber
                    + ' | SI Prepayment internal id: ' + stSIPPId
                    + ' | Sequence: ' + stSequence
                });
                /*
                 * Get Department and Location from PO
                 */
                var stDepartment = objRecPO.getValue({ fieldId: 'department' });
                var stLocation = objRecPO.getValue({ fieldId: 'location' });

                log.debug({
                    title: stLogTitle,
                    details: 'PO (dept, location): ' + stDepartment + ', ' + stLocation
                });
                // Load SI_PrePay
                var objRecPrePay = record.load({
                    type: 'customrecord_si_prepayments',
                    id: stSIPPId
                });

                var stRefNum = stPONumber + '-PP' + stSequence;
                objRecVB.setValue({
                    fieldId: 'tranid',
                    value: stRefNum
                });
                objRecVB.setValue({
                    fieldId: 'entity',
                    value: objRecPrePay.getValue({ fieldId: 'custrecord_si_prepay_vendor' })
                });
                objRecVB.setValue({
                    fieldId: 'trandate',
                    value: objRecPrePay.getValue({ fieldId: 'custrecord_si_prepay_date' })
                });
                objRecVB.setValue({
                    fieldId: 'terms',
                    value: objRecPrePay.getValue({ fieldId: 'custrecord_si_prepay_terms' })
                });
                objRecVB.setValue({
                    fieldId: 'currency',
                    value: objRecPO.getValue({ fieldId: 'currency' })
                });
                /*
                 * Compute Rate
                 */
                var flPrePayPct = forceParseFloat(objRecPrePay.getValue({ fieldId: 'custrecord_si_prepay_percent' }));
                var flPrePayPctAdj = forceParseFloat(objRecPrePay.getValue({ fieldId: 'custrecord_si_prepay_allowance_adj' }));

                log.debug({
                    title: stLogTitle,
                    details: 'PrePaymentPct: ' + flPrePayPct + ' | PrePaymentPctAdj: ' + flPrePayPctAdj
                });
                // var flRate = flEligibleAmount*(flPrePayPct - flPrePayPctAdj)/100;
                /*
                 * GBM: 9/9/2016
                 * Please change this to following:((Total amount for the line items where “exclude for prepayment” is not checked) * (1- Prepayment allowance))* prepayment percent
                 */
                var flRate = flEligibleAmount * ((100 - flPrePayPctAdj) / 100) * (flPrePayPct / 100);
                log.debug({
                    title: stLogTitle,
                    details: 'VB item parameter: ' + stParamItemId + ' | Computed Rate: ' + flRate
                });
                /*
                 * select item line item
                 */
                objRecVB.selectLine({ sublistId: 'item', line: intIdx });
                objRecVB.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: stParamItemId
                });
                objRecVB.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: 1
                });
                objRecVB.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: flRate
                });
                objRecVB.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'department',
                    value: stDepartment
                });
                objRecVB.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: stLocation
                });
                // Get current line value
                var intPOItemLine = objRecVB.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'orderline'
                });

                objRecVB.commitLine({
                    sublistId: 'item'
                });

                log.debug({
                    title: stLogTitle,
                    details: 'Modified Line: ' + intPOItemLine
                });

                // Clear expense lines
                updateVBLines(objRecVB, 'expense', -1);
                // Retain script parameter item
                updateVBLines(objRecVB, 'item', intPOItemLine);

                var stVBId = objRecVB.save();
                log.audit({
                    title: stLogTitle,
                    details: 'Created VendorBill: ' + stVBId
                });
                /*
                 * Update SI_PrePay
                 */
                objRecPrePay.setValue({
                    fieldId: 'custrecord_si_prepay_vb_ref',
                    value: stVBId
                });
                var stUpdatedPP = objRecPrePay.save();
                log.audit({
                    title: stLogTitle,
                    details: 'Updated SI PrePayment: ' + stUpdatedPP
                });
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }
        /*
         * compute eligible amount for sublist
         */
        function getEligibleAmount(objRecPO, sublist, flEligibleAmount) {
            var stLogTitle = 'getEligibleAmount';
            try {
                var intExpLineCount = objRecPO.getLineCount(sublist);
                for (var intLine = 0; intLine < intExpLineCount; intLine++) {
                    var stExclude = objRecPO.getSublistText({
                        sublistId: sublist,
                        fieldId: 'custcol_si_prepay_exclude',
                        line: intLine
                    });
                    var stAmount = objRecPO.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'amount',
                        line: intLine
                    });

                    log.debug({
                        title: stLogTitle,
                        details: 'PO (Line, Exclude, Amount): ' + intLine + ', ' + stExclude + ', ' + stAmount
                    });
                    if (stExclude != 'T') {
                        flEligibleAmount += forceParseFloat(stAmount);
                        log.debug({
                            title: stLogTitle,
                            details: 'Updated Total: ' + flEligibleAmount
                        });
                    }
                }

                return flEligibleAmount;
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }

        /*
         * function remove all lines except line
         */
        function updateVBLines(objRecVB, sublist, line) {
            /*
             * remove all other lines except the modified line
             */
            var stLogTitle = 'updateVBLines';
            log.debug({
                title: stLogTitle,
                details: 'Updated VB List: ' + sublist + ' | Retain Line: ' + line
            });
            var intLineCount = objRecVB.getLineCount({ sublistId: sublist });
            for (var intLine = (intLineCount - 1); intLine >= 0; intLine--) {
                var sublistLine = objRecVB.getSublistValue({
                    sublistId: sublist,
                    fieldId: 'orderline',
                    line: intLine
                });
                if (sublistLine != line) {
                    objRecVB.removeLine({
                        sublistId: sublist,
                        line: intLine
                    });
                }
            }
        }

        /*
         * search if item is already in list; if not add line and update record
         */
        function updatePOLineItems(objRecPO, stItem) {
            var stLogTitle = 'updatePOLineItems';
            try {
                /*
                 * Add line item
                 */
                objRecPO.selectNewLine({ sublistId: 'item' });
                objRecPO.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: stItem
                });
                objRecPO.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: 1
                });
                objRecPO.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: 0
                });
                objRecPO.commitLine({
                    sublistId: 'item'
                });
                var stUpdatedPO = objRecPO.save();
                log.audit({
                    title: stLogTitle,
                    details: 'Added Line Item to PO: ' + stUpdatedPO
                });

                return;
            }
            catch (e) {
                log.error({ title: stLogTitle, details: e.toString() });
                throw e;
            }
        }

        /*
         * reusable utility functions
         */
        function forceParseFloat(stValue) {
            return (isNaN(parseFloat(stValue)) ? 0.00 : parseFloat(stValue));
        }

        function forceParseInt(stValue) {
            return (isNaN(parseInt(stValue, 10)) ? 0 : parseInt(stValue, 10));
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });

