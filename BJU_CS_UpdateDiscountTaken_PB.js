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
 * 1.00       25 Aug 2015     gruiz
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * 
 * @appliedtorecord recordType
 * 
 * @param {String}
 *            type Sublist internal id
 * @param {String}
 *            name Field internal id
 * @param {Number}
 *            linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function fieldChanged_updateDiscountTaken(type, name, linenum) {

    if (name == "apply" && nlapiGetCurrentLineItemValue('apply', 'apply') == 'T') {
        var currentIndex = nlapiGetCurrentLineItemIndex('apply');
        var col_currentLineRecordID = nlapiGetLineItemValue('apply', 'internalid', currentIndex);

        var vbRecord = nlapiLoadRecord('vendorbill', col_currentLineRecordID);

        var discountTaken = vbRecord.getFieldValue('custbody_bju_net_discount_amt');

        nlapiSetLineItemValue('apply', 'disc', currentIndex, discountTaken);

    }
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * 
 * @appliedtorecord recordType
 * 
 * @param {String}
 *            type Sublist internal id
 * @returns {Boolean} True to continue line item insert, false to abort insert
 */

function isEmpty(field) {
    if (field == '' || field == null || field == "null" || field == undefined) {
        return true;
    }

    return false;

}/* end function isEmpty */
