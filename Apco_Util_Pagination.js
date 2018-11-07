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
 * PAGINATION LIBRARY
 * Jeremy A. Jacob
 * Feb 8, 2017
 * 
 * Aj | 4 Apr 2017
 * 
 * Added page size limit
 */
var Pagination =
    {

        LOG_TITLE: 'Pagination',

        LIST_PAGE_SIZE: [50, 100, 200, 300, 400, 500],

        PREFIX: 'custpage_',

        FIELD_PAGE_NO: 'pageno',

        FIELD_PAGE_SIZE: 'pagesize',

        FIELD_CACHE: 'pagination_cache',

        FIELD_PAGE_DATA: 'custpage_current_page_data',

        FIELD_PAGE_PREV: 'custpage_btn_prev',

        FIELD_PAGE_NEXT: 'custpage_btn_next',

        CURRENT_PAGE_NO: null,

        CURRENT_PAGE_SIZE: null,

        CACHE_RECORD_NAME: 'customrecord_pagination_cache',

        /*
        ARR_FIELD_MAP : 
        {
            custpage_id : 1,			// Record Id
            custpage_project_hd : 2, 	// Project
            custpage_projtask_hd : 3, 	// Project Task
            custpage_projtask_btn : 4, 	// Select Project Task
            custpage_tr_hours : 5		// Hours
        },
        */

        /**
         * Lay out pagination form selectors
         * 
         * @param {Object} option.form - REQUIRED
         * @param {String} option.recordType - REQUIRED
         * @param {String} option.savedSearch - REQUIRED
         * @param {String} option.filters - REQUIRED
         * @param {String} option.urlPageNo - OPTIONAL
         * @param {String} option.urlPageSize - OPTIONAL
         * @param {String} option.tab - OPTIONAL
         * @param {String} option.name - OPTIONAL
         * 
         */
        displaySelectors: function (option) {

            var logTitle = Pagination.LOG_TITLE + '.displaySelectors';

            var fieldNameSuffix = option.name || '';

            // -- Page No --

            // Field id
            var fldPageNoId = Pagination.PREFIX + Pagination.FIELD_PAGE_NO + fieldNameSuffix;

            // Add page no field to objForm
            var objPageNo = option.form.addField(fldPageNoId, 'select', 'Page', null, option.tab);
            objPageNo.setDisplaySize(100);
            objPageNo.setLayoutType('endrow', 'none');

            // Get total records
            var totalRecords = Pagination.getTotalRecords({
                recordType: option.recordType,
                savedSearch: option.savedSearch,
                filters: option.filters
            });

            // Get page no and page size from URL params
            var urlPageNo = option.urlPageNo;
            var urlPageSize = option.urlPageSize;

            // Base page no and page size
            var currentPageNo = urlPageNo || 1;
            var currentPageSize = urlPageSize || Pagination.LIST_PAGE_SIZE[0];

            // Compute total pages
            var totalPages = Math.ceil(parseInt(totalRecords) / currentPageSize);

            // If the URL page no value is greater  
            if (parseInt(urlPageNo) > totalPages) {
                currentPageNo = totalPages;
            }

            nlapiLogExecution('debug', logTitle, 'PAGINATION: totalRecords=' + totalRecords +
                ' | totalPages=' + totalPages + ' | currentPageSize=' + currentPageSize + ' | currentPageNo=' + currentPageNo);

            for (var i = 1; i <= totalPages; i++) {
                objPageNo.addSelectOption(i, 'Page ' + i);
            }

            // Set page no field value
            objPageNo.setDefaultValue(currentPageNo.toString());


            // -- Page size --

            // Field id
            var fldPageSizeId = Pagination.PREFIX + Pagination.FIELD_PAGE_SIZE + fieldNameSuffix;

            // Add page size field to objForm
            var objPageSize = option.form.addField(fldPageSizeId, 'select', 'Page Size', null, option.tab);
            objPageSize.setDisplaySize(100);
            objPageSize.setLayoutType('endrow', 'none');

            //Add base option
            objPageSize.addSelectOption(Pagination.LIST_PAGE_SIZE[0], Pagination.LIST_PAGE_SIZE[0]);

            // Show page size list	
            for (var i = 0; i < Pagination.LIST_PAGE_SIZE.length; i++) {

                var size = Pagination.LIST_PAGE_SIZE[i];

                if (totalRecords > size) {
                    var pageSizeLength = Pagination.LIST_PAGE_SIZE.length;

                    var intAddedSizeList = parseInt(i) + 1;

                    if (intAddedSizeList >= pageSizeLength) {
                        break;
                    }

                    objPageSize.addSelectOption(Pagination.LIST_PAGE_SIZE[intAddedSizeList], Pagination.LIST_PAGE_SIZE[intAddedSizeList]);

                }
            }

            // Set page size field value
            objPageSize.setDefaultValue(currentPageSize);

            // Set current page no and page size
            Pagination.CURRENT_PAGE_NO = currentPageNo;
            Pagination.CURRENT_PAGE_SIZE = currentPageSize;

            return option.form;

        },

        /**
         * Perform search but only retrieves the total number of rows
         * @param {String} option.recordType
         * @param {String} option.savedSearch
         * @param {Array} option.filters
         */
        getTotalRecords: function (option) {
            var logTitle = Pagination.LOG_TITLE + '.getTotalRecords';

            var arrReturnSearchResults = Pagination.search({
                isRowCountOnly: true,
                recordType: option.recordType,
                savedSearch: option.savedSearch,
                filters: option.filters
            });

            var totalRecords = 0;

            if (arrReturnSearchResults && arrReturnSearchResults[0]) {
                totalRecords = arrReturnSearchResults[0].getValue('internalid', null, 'COUNT');
            }

            return totalRecords;

        },

        /**
         * Perform search for the current page
         * 
         * @param {String} recordType
         * @param {String} savedSearch
         * @param {Array} filters
         * @param {Array} columns
         * @param {String} pageSize
         * @param {String} pageNo
         */
        getPage: function (option) {
            var logTitle = Pagination.LOG_TITLE + '.getPage';
            var indexStart = 0;
            var count = option.pageSize || Pagination.LIST_PAGE_SIZE[0];

            if (option.pageNo && option.pageSize) {
                indexStart = (parseInt(option.pageNo) - 1) * parseInt(option.pageSize);
            }

            var arrResults = Pagination.search({
                recordType: option.recordType,
                savedSearch: option.savedSearch,
                filters: option.filters,
                columns: option.columns,
                indexStart: indexStart,
                count: count
            });

            nlapiLogExecution('debug', logTitle, 'PAGINATION: indexStart=' + indexStart + ' | count=' + count + ' | arrResults=' + (arrResults ? arrResults.length : 0));

            return arrResults;

        },

        /**
         * @param {Object} option.form - REQUIRED
         * @param {String} option.value - REQUIRED
         */
        addCacheToForm: function (option) {
            if (option.form && option.value) {
                var fldCacheId = Pagination.PREFIX + Pagination.FIELD_CACHE;
                option.form.addField(fldCacheId, 'text', fldCacheId).setDisplayType('hidden').setDefaultValue(option.value);
            }

            return option.form;
        },

        /**
         * @param option.data
         * @param option.cache
         * @param option.script
         * 
         */
        setCache: function (option) {
            var logTitle = Pagination.LOG_TITLE + '.setCache';

            try {
                // Load cache record
                if (option.cache) {
                    var arrAdded = option.dataAdded;
                    var arrDeleted = option.dataDeleted;

                    if (arrDeleted.length > 0 || arrAdded.length > 0) {
                        // Load cache
                        var arrCacheData = Pagination.getCache({
                            id: option.cache
                        });

                        var arrNewCacheData = Pagination.mergeDataToCache({
                            oldData: arrCacheData,
                            deleted: arrDeleted,
                            added: arrAdded
                        });

                        // Update cache
                        nlapiSubmitField(Pagination.CACHE_RECORD_NAME, option.cache, ['custrecord_pagination_cache_data'], [JSON.stringify(arrNewCacheData.merged)]);

                    }

                    return option.cache;
                }

                // Create new cache record
                else {
                    var user = nlapiGetUser();

                    // Clean up other cache by the same current user
                    Pagination.cleanUpCache({
                        user: user,
                        script: option.script
                    });

                    // Create new cache
                    var newCache = nlapiCreateRecord(Pagination.CACHE_RECORD_NAME);
                    newCache.setFieldValue('custrecord_pagination_cache_user', user);
                    newCache.setFieldValue('custrecord_pagination_cache_data', JSON.stringify(option.dataAdded));
                    newCache.setFieldValue('custrecord_pagination_cache_script', option.script);

                    var cacheId = nlapiSubmitRecord(newCache);
                    return cacheId;
                }

            }
            catch (e) {

                var msg = (e.message != undefined) ? e.name + ' ' + e.message : e.toString();
                nlapiLogExecution('error', logTitle, 'PAGINATION: CACHE_ERROR ' + msg);
            }

        },

        /**
         * Load pagination cache record
         * @param option.id 
         */
        getCache: function (option) {
            // Load cache record
            if (option.id) {
                var stCache = nlapiLookupField(Pagination.CACHE_RECORD_NAME, option.id, 'custrecord_pagination_cache_data');
                return (stCache) ? JSON.parse(stCache) : '';
            }
        },

        createCache: function (option) {
            //if (option.user && option.data && option.script && option.sessionKey)
            if (option.user && option.data && option.script) {
                var newCache = nlapiCreateRecord(this.CACHE_RECORD_NAME);
                newCache.setFieldValue('custrecord_pagination_cache_user', option.user);
                newCache.setFieldValue('custrecord_pagination_cache_data', JSON.stringify(option.data));
                newCache.setFieldValue('custrecord_pagination_cache_script', option.script);
                //newCache.setFieldValue('custrecord_pagination_cache_session', option.sessionKey);
                var cacheId = nlapiSubmitRecord(newCache);
                return cacheId;

            }
        },

        /**
         * @param option.id - Required. Line record id
         * @param option.cacheData - Required. Array of data loaded from pagination cache
         */
        /*
        isSelected : function(option) 
        {
            if (option.id && option.cacheData && option.cacheData.length > 0)
            {
                // With line data
                if (this.ARR_FIELD_MAP)
                {
                    var selected = false;
                	
                    // Loop through cache data and look for a match for the line record id
                    for (var i = 0; i < option.cacheData.length; i++)
                    {
                        var objCacheData = option.cacheData[i];
                        if (objCacheData && option.id == objCacheData['custpage_id'])
                        {
                            selected = true;
                            break;
                        }	
                    }
                	
                    return selected;
                }	
            	
                // Data has id only
                else
                {
                    return this.inArray(option.id, option.cacheData);
                }	
            }	
        },
        */
        /**
         * Merges data
         * @param {Array} oldData
         * @param {Array} newData
         * @param {Array} deleted
         * @param {Array} added
         */
        /*
        mergeDataToCache : function(option)
        {
            if (option.oldData)
            {
                var arrOldData = option.oldData || [];
                var arrNewData = option.newData || [];
                var arrDeleted = option.deleted || [];
                var arrAdded = option.added || [];
            	
                var arrMergedData = arrOldData; 
            	
                // Get deleted data 
                if (!arrDeleted || arrDeleted.length == 0)
                {
                    if (arrNewData && arrNewData.length > 0)
                    {
                        // Get data removed
                        arrDeleted = arrOldData.filter((function(oldItem){
                            for (var i = 0; i < arrNewData.length; i++)
                            {
                                if(oldItem == arrNewData[i]) return false;
                            }
                            return true;
                        }));
                    }	
                }	
                	
                if (arrDeleted && arrDeleted.length > 0)
                {
                    // Remove deleted data 
                    arrMergedData = arrOldData.filter((function(oldItem){
                        for (var i = 0; i < arrDeleted.length; i++)
                        {
                            if(oldItem == arrDeleted[i]) return false;
                        }
                        return true;
                    }));
                }	
            	
                // Get data added
                if (!arrAdded || arrAdded.length == 0)
                {
                    if (arrNewData && arrNewData.length > 0)
                    {
                        arrAdded = arrNewData.filter((function(newItem){
                            for (var i = 0; i < arrOldData.length; i++)
                            {
                                if(newItem == arrOldData[i]) return false;
                            }
                            return true;
                        }));
                    }
                }
    
                // Add new data
                arrMergedData = arrMergedData.concat(arrAdded);
            	
                var objMerge = 
                {
                    deleted : arrDeleted,
                    added : arrAdded,
                    merged : arrMergedData
                };
    
                return objMerge;
            	
            }	
        	
        },
        */
        /**
         * Clean up other cache record by the same user
         * @param user
         */
        cleanUpCache: function (option) {
            var logTitle = Pagination.LOG_TITLE + '.cleanUpCache';

            if (option.user && option.script) {
                var filters = [];
                filters.push(new nlobjSearchFilter('custrecord_pagination_cache_user', null, 'is', option.user));
                filters.push(new nlobjSearchFilter('custrecord_pagination_cache_script', null, 'is', option.script));

                var results = nlapiSearchRecord(Pagination.CACHE_RECORD_NAME, null, filters);

                for (var i = 0; results && i < results.length; i++) {
                    try {
                        Pagination.deleteCache({
                            id: results[i].getId()
                        })
                    }
                    catch (e) {
                        var msg = (e.message != undefined) ? e.name + ' ' + e.message : e.toString();
                        nlapiLogExecution('error', logTitle, 'PAGINATION: CACHE_DELETE_ERROR ' + msg);
                    }
                }

            }

        },

        /**
         * @param option.id
         */
        deleteCache: function (option) {
            var logTitle = Pagination.LOG_TITLE + '.deleteCache';
            try {
                if (option.id) {
                    nlapiDeleteRecord(Pagination.CACHE_RECORD_NAME, option.id);
                    nlapiLogExecution('audit', logTitle, 'PAGINATION: Cache record deleted | id=' + option.id);
                }
            }
            catch (e) {
                var msg = (e.message != undefined) ? e.name + ' ' + e.message : e.toString();
                nlapiLogExecution('error', logTitle, 'PAGINATION: CACHE_DELETE_ERROR ' + msg);
            }
        },

        /**
         * UTIL: Search
         */
        search: function (option) {

            var arrSearchResults = new Array();
            var objSearch = null;

            if (option.savedSearch != null) {
                objSearch = nlapiLoadSearch((option.recordType) ? option.recordType : null, option.savedSearch);

                // Return row count
                if (option.isRowCountOnly === true) {
                    if (option.filters != null) {
                        objSearch.addFilters(option.filters);
                    }
                    objSearch.setColumns([new nlobjSearchColumn('internalid', null, 'COUNT')]);
                }
                else {
                    if (option.filters != null) {
                        objSearch.addFilters(option.filters);
                    }

                    if (option.columns != null) {
                        objSearch.addColumns(option.columns);
                    }
                }

            }
            else {
                objSearch = nlapiCreateSearch((option.recordType) ? option.recordType : null, option.filters, option.columns);
            }

            var nlobjResultset = objSearch.runSearch();

            var indexStart = option.indexStart || 0;
            var resultSlice = null;
            var intMaxResult = 1000;

            // If option.count is less than 1000, set as ending index
            if (option.count) {
                var intCount = parseInt(option.count);
                intMaxResult = (intCount < intMaxResult) ? intCount : intMaxResult;
            }

            mainLoop: do {
                resultSlice = nlobjResultset.getResults(indexStart, indexStart + intMaxResult);

                if (!resultSlice) break;

                for (var intRs in resultSlice) {
                    arrSearchResults.push(resultSlice[intRs]);

                    // Break, return results based on count
                    if (option.count && arrSearchResults.length == parseInt(option.count)) {
                        break mainLoop;
                    }

                    indexStart++;
                }
            }
            while (resultSlice.length >= 1000);

            return arrSearchResults;

        },

        generateSessionKey: function () {
            return new Date().getTime();
        },

        /**
         * UTIL: Finds an element from an array
         */
        inArray: function (stValue, arrValue) {
            var bIsValueFound = false;
            if (stValue && arrValue) {
                for (var i = arrValue.length - 1; i >= 0; i--) {
                    if (stValue == arrValue[i]) {
                        bIsValueFound = true;
                        break;
                    }
                }
            }
            return bIsValueFound;
        },


    };
