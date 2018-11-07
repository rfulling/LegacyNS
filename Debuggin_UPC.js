    
require(['N/runtime', 'N/error', 'N/search', 'N/record', 'N/format'],
    function (runtime, error, search, record, format) {

        beforeSubmit();
        function beforeSubmit(context) {

            var objChildren = getAllChildItems('customsearch_get_child_items', 283,6479);//recTran.getValue({ fildId: 'parent' }));

        }

        // returns all Children
        function getAllChildItems(stChildSearch, parentId,childId) {
            log.debug('getNextAvailableUPC', 'start...');
            var stId = '';
            var stText = '';

            var filters = [];

            filters[0] = search.createFilter({
                name: 'parent',
                operator: search.Operator.IS,
                values: parentId
            });

            filters[1] = search.createFilter({
                name: 'internalid',
                operator: search.Operator.NONEOF,
                values: childId
            });

            var arrResult = NSUtilsearch('item', stChildSearch, filters, null);

            if (!NSUtilisEmpty(arrResult)) {
                var objResult = arrResult;

                return objResult;
            } else {
                log.debug('getNextAvailableUPC', 'No available UPC Code.');
                return;
            }
        }

  

        function  NSUtilsearch (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
            if (stRecordType == null && stSearchId == null) {
                error.create(
                    {
                        name: 'SSS_MISSING_REQD_ARGUMENT',
                        message: 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.',
                        notifyOff: false
                    });
            }


            var arrReturnSearchResults = new Array();
            var objSavedSearch;

            var maxResults = 1000;

            if (stSearchId != null) {
                objSavedSearch = search.load(
                    {
                        id: stSearchId
                    });

                // add search filter if one is passed
                if (arrSearchFilter != null) {
                    objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
                }

                // add search column if one is passed
                if (arrSearchColumn != null) {
                    objSavedSearch.columns = objSavedSearch.columns.concat(arrSearchColumn);
                }
            }
            else {
                objSavedSearch = search.create(
                    {
                        type: stRecordType
                    });

                // add search filter if one is passed
                if (arrSearchFilter != null) {
                    objSavedSearch.filters = arrSearchFilter;
                }

                // add search column if one is passed
                if (arrSearchColumn != null) {
                    objSavedSearch.columns = arrSearchColumn;
                }
            }

            var objResultset = objSavedSearch.run();
            var intSearchIndex = 0;
            var arrResultSlice = null;
            do {
                arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + maxResults);
                if (arrResultSlice == null) {
                    break;
                }

                arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
                intSearchIndex = arrReturnSearchResults.length;
            }
            while (arrResultSlice.length >= maxResults);

            return arrReturnSearchResults;
        };

        function NSUtilisEmpty (stValue) {
            return ((stValue === '' || stValue == null || stValue == undefined)
                || (stValue.constructor === Array && stValue.length == 0)
                || (stValue.constructor === Object && (function (v) { for (var k in v) return false; return true; })(stValue)));
        };

       return {
            beforeSubmit: beforeSubmit
        };



    });