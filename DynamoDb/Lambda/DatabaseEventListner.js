var AWS = require("aws-sdk");
var kpiCalculator = require('./kpiCalculator');

console.log('Loading function');

exports.handler = function (event, context, callback) {
	console.log(JSON.stringify(event, null, 2));
	event.Records.forEach(function (record) {
		console.log(record.eventID);
		console.log(record.eventName);
		console.log('DynamoDB Record: %j', record.dynamodb);

		if (record.eventName == "INSERT") {
			var id = record.dynamodb.Keys.Id.S;
			
			var suctionPressure = parseInt(record.dynamodb.NewImage.SuctionPressure.S);
			var dischargePressure =  parseInt(record.dynamodb.NewImage.DischargePressure.S);
			var flowRate = parseInt(record.dynamodb.NewImage.FluidFlow.S);
			var motorPowerInput = parseInt(record.dynamodb.NewImage.ElectricPower.S);
			
			var effeciencyRequest = {
					"suctionPressure": suctionPressure,
					"dischargePressure": dischargePressure,
					"flowRate": flowRate,
					"motorPowerInput": motorPowerInput,
					"motorEfficiency": 0.96,
				};
			
			var dynamicHeadRequest = {
					"suctionPressure": suctionPressure,
					"dischargePressure": dischargePressure,
					"flowRate": flowRate,
					"suctionDiameter": 1.5,
					"dischargeDiameter": 1,
					"suctionHeight": 1,
					"dischargeHeight": 6,
					"density": 1
				}
			
			updateDetails(id,effeciencyRequest,dynamicHeadRequest);
		}
	});
	callback(null, "message");
};


function updateDetails(id,effeciencyRequest,dynamicHeadRequest) {

	var table = "MeasuredData";
	AWS.config.update({
		region: "ap-south-1"
	});

	var docClient = new AWS.DynamoDB.DocumentClient()

/*	//Calculate KPI 
	var effeciencyRequest = {
		"suctionPressure": 100,
		"dischargePressure": 300,
		"flowRate": 600,
		"motorPowerInput": 100,
		"motorEfficiency": 0.96,
	};

	var dynamicHeadRequest = {
		"suctionPressure": 5,
		"dischargePressure": 80,
		"flowRate": 70,
		"suctionDiameter": 1.5,
		"dischargeDiameter": 1,
		"suctionHeight": 1,
		"dischargeHeight": 6,
		"density": 1
	}*/
	console.log("id"+id);
	console.log("effeciencyRequest"+effeciencyRequest);
	console.log("dynamicHeadRequest"+dynamicHeadRequest);

	var calculatedPumpEffeciency = kpiCalculator.calculatePumpEffeciency(effeciencyRequest);
	var calculatedDynamicHead = kpiCalculator.calculateDynamicHead(dynamicHeadRequest);
	console.log("calculatedPumpEffeciency"+calculatedPumpEffeciency);
	console.log("calculatedDynamicHead"+calculatedDynamicHead);


	// Update the item, unconditionally,
	var params = {
		TableName: table,
		Key: {
			"Id": id,
		},
		UpdateExpression: "set PumpEffeciency = :pumpEffeciency, DynamicHead = :dynamicHead",
		ExpressionAttributeValues: {
			":pumpEffeciency": calculatedPumpEffeciency,
			":dynamicHead": calculatedDynamicHead
		},
		ReturnValues: "UPDATED_NEW"
	};

	console.log("Updating the item...");
	docClient.update(params, function (err, data) {
		if (err) {
			console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
		} else {
			console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
		}
	});

}