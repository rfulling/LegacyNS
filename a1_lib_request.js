/**
 * Part of the A1 library for handling external requests.
 *
 * @NApiVersion 2.0
 * @NModuleScope SameAccount
 */
define(['N/https'],

    /**
     * @param {https} https
     */
    function (https) {

        /**
         * Call the external resource.
         *
         * @param {string} url - the url to call.
         * @param {array}  data - the data to send.
         *
         * @return {object|void}
         */
        function connect(url, data) {

            var response;

            try {
                log.audit({
                    title: 'a1_request_library@connect:request',
                    details: data
                });

                response = https.post({
                    url: 'https://warehouse-dot-a1comms-sapi.appspot.com/' + url,
                    body: JSON.stringify(data),
                    headers: {
                        'Content-type': 'application/json'
                    }
                });

                log.audit({
                    title: 'a1_request_library@connect:response',
                    details: response
                });

                return response;
            } catch (error) {
                log.error({
                    title: 'a1_request_library@connect:catch',
                    details: error.toString()
                });

                return;
            }
        }

        /**
         * Make a request to an external resource.
         *
         * @param {string} url - the url to call.
         * @param {array}  data - the data to send.
         *
         * @return {object|void}
         */
        function call(url, data) {
            return connect(url, data);
        }

        return {
            call: call
        };
    });