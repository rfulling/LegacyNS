/**
 * Module DescriptionnlapiSubmitField
 * This script will be used to populate the time sheets
 * with the weighted average of the revenue allocated to the project
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Jan 2016     rfulling
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */

function beforeSubmit(type) {
    var subId = nlapiGetFieldValue('subsidiary');
    var subInfo = nlapiLookupField('subsidiary', subId, ['custrecord_apco_inv_seq_nbr','tranprefix']);
    nlapiSubmitField('subsidiary', subId, 'custrecord_apco_inv_seq_nbr', parseInt(subInfo.tranprefix) + 1);
    nlapiSetFieldValue('tranid', subInfo.custrecord_apco_inv_seq_nbr + ' ' + subInfo.tranprefix);
}