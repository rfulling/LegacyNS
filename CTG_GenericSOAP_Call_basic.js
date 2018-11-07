/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(
    ['N/auth', 'N/crypto', 'N/runtime', 'N/record', 'N/https', 'N/url', 'N/encode'],

    function (auth, crypto, runtime, record, https, url, encode) {

        function onRequest(context) {
            try {

                // var soapUrl = 'https://testics-ctgoracle.uscom-central-1.oraclecloud.com/ic/ws/integration/v1/flows/soap/TEST_ECHO/1.0/?wsdl';

                var username = 'Integration_user';
                var password = 'Evosys1234';

                var encodedString = encode.convert({
                    string: username + ':' + password,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });

                var soapHeaders = new Array();
                soapHeaders['User-Agent-x'] = 'SuiteScript-Call';
                soapHeaders['Content-Type'] = 'text/xml';
                soapHeaders['execute'] = 'http://testapp/execute';
                soapHeaders['Authorization'] = 'Basic ' + encodedString

                //var soapUrl = 'https://testics-ctgoracle.uscom-central-1.oraclecloud.com/ic/ws/integration/v1/flows/soap/TEST_ECHO/1.0/?wsdl';
                var soapUrl = 'https://TestICS-ctgoracle.uscom-central-1.oraclecloud.com:443/ic/ws/integration/v1/flows/soap/TEST_ECHO/1.0/';

                var soapenv = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tes="http://testapp/">'
                    + '<soapenv:Header/>'
                    + '   <soapenv:Body>'
                    + '		<tes:execute>'
                    + '      			<!--Optional:-->'
                    + '          <name>?</name>'
                    + '      </tes:execute>'
                    + '</soapenv:Body>'
                    + '</soapenv:Envelope>'


                var httpresponse = https.request({
                    method: 'POST',
                    url: soapUrl,
                    headers: soapHeaders,
                    body: soapenv
                });

                context.response.write({
                    output: httpresponse.body
                });

            } catch (exception) {
                context.response.write({
                    output: exception.message
                });
                return exception;
            }
        }



        return {
            onRequest: onRequest
        };

    });
