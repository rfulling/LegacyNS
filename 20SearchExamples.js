/**
 *@NApiVersion 2.x
 *@NScriptType Portlet
 */
 
/**
* Copyright (c) 1998-2014 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* @author Eugen Raceanu
* @version 2.0
* @event: Portlet
* 
* Module description: 
* The script is triggered .
*
*/
 

var DEBUG = true;

require([
		'N/error',
        'N/log',
		'N/runtime',
		'N/search'
        ],
/**
 * @param {error} error
 * @param {log} log
 * @param {runtime} runtime
 * @param {search} search
 */
function(error, log, runtime, search) 
{

	function render(context) 
	{
		try
        {

            var searchToRun = 'customsearch_bjh_email_transaction';
            var tranSearch = search.load({ id: searchToRun });
            var searchFilter = search.createFilter({
                name: 'internalid',
                join: 'customer',
                operator: search.Operator.ANYOF,
                values: 780
            });

            tranSearch.filters.push(searchFilter);
            var arrInv = tranSearch.run().getRange({
                start: 0,
                end: 50
            });
            log.debug('results ', arrInv);



			var TITLE = 'portletScript_gedDashRepCF'; //function name
			logMessage('DEBUG', TITLE+' #0', '--> Script START <--');
			
			var currentScript = runtime.getCurrentScript();
			var stSavedSearchId = currentScript.getParameter(
			{
				name : 'custscript_savedsid2'
			});
			var stPortletName = currentScript.getParameter(
			{
				name : 'custscript_portletname2'
			});
			var stCol1Header = currentScript.getParameter(
			{
				name : 'custscript_col1header2' //'Ship Week'
			});
			stCol1Header = ((stCol1Header) && (stCol1Header.length > 0)) ? stCol1Header : 'Ship Week';
			var stCol1Row1 = currentScript.getParameter(
			{
				name : 'custscript_col1row12' // 'Production Volume for Shipweek (Up Loaded)'
			});
			stCol1Row1 = ((stCol1Row1) && (stCol1Row1.length > 0)) ? stCol1Row1 : 'Production Volume for Shipweek (Up Loaded)';
			var stCol1Row2 = currentScript.getParameter(
			{
				name : 'custscript_col1row22' // 'Produced (of the orders in ship week)'
			});
			stCol1Row2 = ((stCol1Row2) && (stCol1Row2.length > 0)) ? stCol1Row2 : 'Produced (of the orders in ship week)';
			var stCol1Row3 = currentScript.getParameter(
			{
				name : 'custscript_col1row32' // 'Left to Produce (of orders in ship week)'
			});
			stCol1Row3 = ((stCol1Row3) && (stCol1Row3.length > 0)) ? stCol1Row3 : 'Left to Produce (of orders in ship week)';
			var stItProdLine = currentScript.getParameter(
			{
				name : 'custscript_itprodline2'
			});
			stItProdLine = ((stItProdLine) && (stItProdLine.length > 0)) ? stItProdLine : '-1';
			var arrItProdLine = stItProdLine.split(',');
			
			logMessage('DEBUG', TITLE+' #1', '--> stSavedSearchId='+stSavedSearchId+' | stPortletName='+stPortletName+' | stItProdLine='+stItProdLine
			+' | stCol1Header='+stCol1Header+' | stCol1Row1='+stCol1Row1+' | stCol1Row2='+stCol1Row2+' | stCol1Row3='+stCol1Row3);
			
			if ((stSavedSearchId) && (isNaN(stSavedSearchId) === false))
			{
				var objSavedSearch = search.load({
					id: stSavedSearchId
				});
				
				if (!((arrItProdLine.length == 1) && (arrItProdLine[0] == '-1')))
				{
					var objSavedSearchAddFilters = search.createFilter(
					{
						name: 'custrecord_product_line',
						operator: search.Operator.ANYOF,
						values: arrItProdLine
					}
					//,{
					//	name: 'custrecord_atp_item_prod_line',
					//	operator: search.Operator.IS,
					//	values: stItProdLine
					//}
					);
					objSavedSearch.filters.push(objSavedSearchAddFilters);
					
					//var objSavedSearchAddColumns = search.createColumn(
					//{
					//	name: 'companyname1'
					//}
					//,{
					//	name: 'companyname2'
					//}
					//);
					//objSavedSearch.columns.push(objSavedSearchAddColumns);
				}
				var arrPortletColumns = [];
				var intCounter = -1;
				
				var objSearchResults = objSavedSearch.run();
				logMessage('DEBUG', TITLE+' #2', '--> objSearchResults='+JSON.stringify(objSearchResults));
				
				objSavedSearch.run().each(function(result) 
				{
					logMessage('DEBUG', TITLE+' #3', '--> result='+JSON.stringify(result));
					
					intCounter++;
					arrPortletColumns[intCounter] = {};
					for (var i = 0; i < result.columns.length; i++)
					{
						arrResultLine.push(result.columns[i]);
						arrPortletColumns[intCounter][objSavedSearch.columns[i].label] = ((result.getText(objSearchResults.columns[i])) && (result.getText(objSearchResults.columns[i]).length > 0)) ? result.getText(objSearchResults.columns[i]) : result.getValue(objSearchResults.columns[i]);
					}
					//logMessage('DEBUG', TITLE+' #5', '--> arrResultLine='+JSON.stringify(arrResultLine));
					return true;
				});
				logMessage('DEBUG', TITLE+' #4', '--> arrPortletColumns='+JSON.stringify(arrPortletColumns));
				
				// Portlet construction
				var portlet = context.portlet;
				portlet.title = ((stPortletName) && (stPortletName !== '')) ? stPortletName : "My Portlet";
				
				logMessage('DEBUG', TITLE+' #5', '--> portlet.title='+portlet.title);
				
				portlet.addColumn(
				{
					id: 'column0',
					type: 'text',
					label: stCol1Header, //'Ship Week'
					align: 'LEFT'
				});
				
				logMessage('DEBUG', TITLE+' #6', '--> Here #6');
				
				for (var j = 0; j < arrPortletColumns.length; j++)
				{
					var stPortletColumnIdDynamic = 'column'+(j+1);
					
					logMessage('DEBUG', TITLE+' #7', '--> stPortletColumnIdDynamic='+stPortletColumnIdDynamic);
					
					portlet.addColumn(
					{
						id: stPortletColumnIdDynamic,
						type: 'text',
						label: arrPortletColumns[j][objSavedSearch.columns[0].label],
						align: 'LEFT'
					});
					logMessage('DEBUG', TITLE+' #8', '--> Here #8');
				}
				
				var arrRows = [];
				
				arrRows[0] = {};
				arrRows[1] = {};
				arrRows[2] = {};
				
				arrRows[0]['column0'] = stCol1Row1; //'Production Volume for Shipweek (Up Loaded)'
				arrRows[1]['column0'] = stCol1Row2; //'Produced (of the orders in ship week)'
				arrRows[2]['column0'] = stCol1Row3; //'Left to Produce (of orders in ship week)'
				
				logMessage('DEBUG', TITLE+' #9', '--> Here #9');
				
				for (var t = 0; t < arrPortletColumns.length; t++)
				{
					var stPortletColumnIdDynamicB = 'column'+(t+1);
					logMessage('DEBUG', TITLE+' #10', '--> stPortletColumnIdDynamicB='+stPortletColumnIdDynamicB);
					
					arrRows[0][stPortletColumnIdDynamicB] = arrPortletColumns[t]['CF Volume- Required to be produced'];
					arrRows[1][stPortletColumnIdDynamicB] = arrPortletColumns[t]['CF Volume - Produced'];
					arrRows[2][stPortletColumnIdDynamicB] = ((arrPortletColumns[t]['CF Volume - To be Produced'] == 0) && (arrPortletColumns[t]['CF Volume- Required to be produced'] != 0) && (arrPortletColumns[t]['CF Volume - Produced'] != 0)) ? 'Complete' : arrPortletColumns[t]['CF Volume - To be Produced'];
				}
				
				logMessage('DEBUG', TITLE+' #11', '--> arrRows='+JSON.stringify(arrRows));
				
				portlet.addRows(
				{
					rows: arrRows
						//[{
						//	columnid1: 'value1',
						//	columnid2: 'value2'
						//},
						//{
						//	columnid1: 'value1',
						//	columnid2: 'value2'
						//}]
				});
				logMessage('DEBUG', TITLE+' #END', '--> Script End');
			}			
		}
		catch (error) 
		{
			function createError() {
				var errorObj = error.create({
					name: '99999',
					message: error.toString(),
					notifyOff: true
				});
			}
			logMessage('ERROR', 'Script Error', error.toString());
			throw createError();
		}
	}
	return {
		render: render
	};
	
	// Utils functions:
	function logMessage(logType, title, details)
	{
		if(DEBUG)
		{
			//nlapiLogExecution(logType, title, details);
			log.debug({
				title: logType+' | '+title, 
				details: details
				});			
		}
	};
});