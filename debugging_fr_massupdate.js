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
 * Module Description/
 *
 * Version    Date            Author           Remarks
 * 1.0        12 Dec 2014     Julius Cuanan
 *
 *
 */

/**
/**
	 * @NApiVersion 2.x
	 * @NScriptType ScheduledScript
	 * @NModuleScope SameAccount
 */

require(['N/search', 'N/file', 'N/runtime'],

    function (search, file, runtime) {

	    /**
	     * Definition of the Scheduled script trigger point.
	     *
	     * @param {Object} scriptContext
	     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
	     * @Since 2015.2
	     */
        function execute(scriptContext) {
            //Here is the saved search to execute
            var myHeader = '';
            var arrLabel = [];

            var myFulfilment = record.load({
                type: record.Type.ITEM_FULFILLMENT, 
                id: myId,
                isDynamic: true,
            });



            var searchToRun = 'customsearch_ns_fulfillments_to_update';//runtime.getCurrentScript().getParameter({ name: 'custscript_search_to_run' });

            var mySearch = search.load({ id: searchToRun });
              mySearch.run().each(function (result) {
                //loop through the columns and get the result for each col
                //todo if columns[isub].type =='select' then get text not Value.
                
                return true;

            });
            try {
                var csvFileId = csvFile.save();
            } catch (e) {
                console.error('Could not Create File', e);
            }
        }
        //return {
        execute();//: execute
        //  };



    });
