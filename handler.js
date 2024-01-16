const https = require('https');
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.DB_NAME;

exports.handler = async (event, context) => {
  let body = {};
  let statusCode = 200;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };
  try {
    switch (`${event.httpMethod} ${event.resource}`) {
      case "GET /{name}":
        if (!event.pathParameters.name) {
          throw new Error('Missing name parameter.');
        } else if (event.pathParameters.name === 'robots.txt') {
          body = "User - agent: *\nDisallow: /"
          return {
            statusCode,
            body,
            headers
          };
        }
        // Get the dynamo key
        body = await dynamo
          .get({
            TableName: tableName,
            Key: {
              name: event.pathParameters.name
            }
          })
          // Convert to promise
          .promise()
          // Convert to promise again to request the proxied url
          .then(val => new Promise(function (resolve, reject) {
            https.get(val.Item.url, (res) => {
              // Build the response
              headers['Content-Type'] = res.rawHeaders[res.rawHeaders.indexOf('Content-Type') + 1];
              let responseBody = '';
              res.on('data', (chunk) => responseBody += chunk);
              res.on('end', () => resolve(responseBody));
            }).on('error', (e) => reject(Error(e)));
          }));
        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}".`);
    }
  } catch (err) {
    console.log(err)
    statusCode = 400;
    body = err.message;
  }

  return {
    statusCode,
    body,
    headers
  };
};
