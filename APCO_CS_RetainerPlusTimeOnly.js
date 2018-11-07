/**
 * Copyright (c) 1998-2016 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 * 
 */

/**
 * Module Description
 * TDD 2: Retainer Plus Time Only
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2016     lbalboa		Scheduled Script for Retainer Time
 * 1.10       23 Mar 2016     mjpascual     Clean-up
 * 
 */

function filter_list() {
    // Getters
    var stProject = nlapiGetFieldValue('custpage_project_filter');

    // Call the suitelet
    var stUrl = nlapiResolveURL('SUITELET', 'customscript_sl_retainer_plus_time_only', 'customdeploy_sl_retainer_plus_time_only');
    stUrl += '&custpage_project_filter=' + stProject;

    // Open the suitelet window
    window.onbeforeunload = null;
    window.location = stUrl;

}
