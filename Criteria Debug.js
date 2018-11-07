var soid = 1288;
var aSearchFilters = new Array();
//var soid =nlapiLookupField('salesorder')
var salesOrderCompare = nlapiLoadRecord('salesorder', soid);

var FLD_RRM_CHILDACC = 'custrecord_rrm_child_accounts'; //for payer
var FLD_RRM_PRODUCT = 'custrecord_rrm_product';
var FLD_RRM_CURRENCY = 'custrecord_rrm_currency';
var FLD_RRM_EFFECTIVEDATE = 'custrecord_rrm_rev_status_effective_date';
var REC_RRM = 'customrecord_rev_rec_matrix';
var FLD_EFFECTIVEDATE = 'custrecord_bt_effective_date';

var idPayer = 17;
var idProduct = 7;
var idCurrency = 1;
var dEffectiveDate = new Date();

aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_CHILDACC, null, 'is', idPayer));
aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_PRODUCT, null, 'is', idProduct));
aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_CURRENCY, null, 'is', idCurrency));
aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_EFFECTIVEDATE, null, 'onorbefore', dEffectiveDate));

aSearchFilters.push(new nlobjSearchFilter('custrecord_rrf_biopsy_6_36mths', null, 'is',

salesOrderCompare.getFieldValue('custbody_age_of_biopsy_6_36_mos')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_biopsy_less_6mths', null, 'is', salesOrderCompare.getFieldValue('custbody_age_of_biopsy_6_mos')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_dcis', null, 'is', salesOrderCompare.getFieldValue('custbody_dcis')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_er_negative', null, 'is', salesOrderCompare.getFieldValue('custbody_er_negative')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_gleason_4_3', null, 'is', salesOrderCompare.getFieldValue('custbody_gleason_4_3')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_gleaseon4_4_greater', null, 'is', salesOrderCompare.getFieldValue('custbody_gleason_4_4_or_greater')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_her2_positive', null, 'is', salesOrderCompare.getFieldValue('custbody_her_2_positive')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_high_vol_gleason_3_4', null, 'is', salesOrderCompare.getFieldValue('custbody_high_volume_gleason_3_4')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_indeterminable', null, 'is', salesOrderCompare.getFieldValue('custbody_indeterminable')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_male', null, 'is', salesOrderCompare.getFieldValue('custbody_male')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_micromets', null, 'is', salesOrderCompare.getFieldValue('custbody_micromets')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_multi_tumor', null, 'is', salesOrderCompare.getFieldValue('custbody_multi_tumor')));

//aSearchFilters.push(new nlobjSearchFilter('custrecord_neoadjuvant_treated', null, 'is', salesOrderCompare.getFieldValue('custbody_neoadjuvant_treated')));

aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_node_positive_1_3_nodes', null, 'is', salesOrderCompare.getFieldValue('custbody_node_positive_1_3_nodes')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_node_positive_4_plus', null, 'is', salesOrderCompare.getFieldValue('custbody_node_positive_4')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_node_unset', null, 'is', salesOrderCompare.getFieldValue('custbody_node_unset')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_nonmed_onc_orders', null, 'is', salesOrderCompare.getFieldValue('custbody_non_med_onc_orders')));

//aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_prostatectomy', null, 'is', salesOrderCompare.getFieldValue('custbody_prostatectomy')));

aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_stage_2', null, 'is', salesOrderCompare.getFieldValue('custbody_stage_2')));
aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_stage_3', null, 'is', salesOrderCompare.getFieldValue('custbody_stage_3')));

//aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_turp_speciman', null, 'is', salesOrderCompare.getFieldValue('custbody_turp_specimen')));

aSearchFilters.push(new nlobjSearchFilter('custrecord_rrm_node_uncertain_unknown', null, 'is', salesOrderCompare.getFieldValue('custbody_uncertain_unknown')));


var aSearchResults = findMatchingRecord(aSearchFilters);
var stop = '';

function findMatchingRecord(bigFilter) {
    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('internalid'));

    try {

        var aSearchResults = nlapiSearchRecord(REC_RRM, null, bigFilter, null);
        return aSearchResults;


    } catch (e) {
        nlapiLogExecution('debug', 'search error', e.message)
    }
}
