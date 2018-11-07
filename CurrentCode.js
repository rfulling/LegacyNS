/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/currentRecord', 'N/url'],
/**
 * @param {record} record
 * @param {url} url
 */
function(record, currentRecord, url){
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        //making sure we are on a Vendor Record
        //var vendorbill = scriptContext.currentRecord;
        var vendorbill = currentRecord.get();
        //var docvueurl = vendorbill.getValue('custbody_vb_docvue_url');
    	
        //debugging purposes to check if I was referencing the rigth field
        //	if (docvueurl == ''){
        // 			finURL = www.google.com;
        //			vendorbill.setValue({'custbody_vb_docvue_url': finURL});
        //			alert('PROPER REFFERENCE OF CUSTOMFIELD.');
   
        //			return true;
   // }
    		
    var baseURL = 'http://ogsysserver:8080/direct?q=query%3D((cc-companyno)eq(';
    var cusNum = 5278;
    var invNo = 111;
    var closeCo = '))and((cc-vendorno)eq(';
    var closeVend = '))and((cc-invoiceno_eq(';
    var endURL = '%26latestVersion%3Dtrue%26appid%3D2&app=2&sp=69&u=1&h=&type=launch&max=5';
    		
    //generating the URL with the hardcoded values
    var finURL = baseURL+cusNum+closeCo+closeVend+invNo+endURL;	
    	
    vendorbill.setValue({ 
        fieldId:'custbody_vb_docvue_url',
        value : finURL })
    			
    return (scriptContext);
  
}

return {
    //      pageInit: pageInit,
    //      fieldChanged: fieldChanged,
    //      postSourcing: postSourcing,
    //      sublistChanged: sublistChanged,
    //      lineInit: lineInit,
    //      validateField: validateField,
    //      validateLine: validateLine,
    //      validateInsert: validateInsert,
    //      validateDelete: validateDelete,
    saveRecord: saveRecord
};
    
});
