# AgroEye Sensor Integration Guide

## Overview

AgroEye now supports connecting IoT moisture sensors to automatically receive and display soil moisture readings. This feature allows you to integrate ESP32, Arduino, or any IoT device that can make HTTP requests.

## How It Works

1. **Add a Sensor**: Create a new sensor in the app to get a unique sensor code
2. **Configure Your Device**: Program your IoT device to send moisture readings to AgroEye
3. **Automatic Updates**: Readings appear automatically in the app with real-time updates

## Step 1: Add a Sensor in the App

1. Open the **Moisture** page in AgroEye
2. Scroll to the **Connected Sensors** section
3. Click the **Add Sensor** button
4. Enter a name for your sensor (e.g., "Garden Bed 1", "Greenhouse A")
5. Click **Add Sensor** - a unique sensor code will be generated automatically
6. Copy the sensor code by clicking the copy icon

## Step 2: Configure Your IoT Device

Your IoT device needs to send POST requests to the AgroEye API endpoint:

### API Endpoint
```
POST https://hhujbxvyluxahsvferfp.supabase.co/functions/v1/sensor-data
```

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "sensor_code": "AGRO-ABC123DEF",
  "moisture_level": 45.5,
  "notes": "Optional notes about the reading"
}
```

### Parameters
- **sensor_code** (required): The unique code generated when you added the sensor
- **moisture_level** (required): A number between 0 and 100 representing the moisture percentage
- **notes** (optional): Any additional information about the reading

## Example Code

### Arduino / ESP32 (with WiFi)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* sensorCode = "AGRO-ABC123DEF"; // Your sensor code from the app
const char* apiEndpoint = "https://hhujbxvyluxahsvferfp.supabase.co/functions/v1/sensor-data";

int moistureSensorPin = 34; // Analog pin for moisture sensor

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
}

void loop() {
  // Read moisture level from sensor
  int sensorValue = analogRead(moistureSensorPin);
  float moistureLevel = map(sensorValue, 0, 4095, 0, 100); // Map to 0-100%
  
  // Send to AgroEye
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiEndpoint);
    http.addHeader("Content-Type", "application/json");
    
    String jsonPayload = "{\"sensor_code\":\"" + String(sensorCode) + 
                        "\",\"moisture_level\":" + String(moistureLevel) + "}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
  
  // Wait 5 minutes before next reading
  delay(300000);
}
```

### Python (Raspberry Pi / MicroPython)

```python
import requests
import time

SENSOR_CODE = "AGRO-ABC123DEF"  # Your sensor code from the app
API_ENDPOINT = "https://hhujbxvyluxahsvferfp.supabase.co/functions/v1/sensor-data"

def read_moisture_sensor():
    # Replace this with your actual sensor reading code
    # Example: Read from GPIO or I2C sensor
    moisture_level = 45.5  # Your sensor reading (0-100)
    return moisture_level

def send_to_agroeye(moisture_level):
    payload = {
        "sensor_code": SENSOR_CODE,
        "moisture_level": moisture_level,
        "notes": f"Reading from Raspberry Pi sensor"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=payload, headers=headers)
        if response.status_code == 200:
            print(f"✓ Data sent successfully: {moisture_level}%")
            print(f"Response: {response.json()}")
        else:
            print(f"✗ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

# Main loop
while True:
    moisture = read_moisture_sensor()
    send_to_agroeye(moisture)
    time.sleep(300)  # Wait 5 minutes
```

### cURL (Testing)

```bash
curl -X POST https://hhujbxvyluxahsvferfp.supabase.co/functions/v1/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_code": "AGRO-ABC123DEF",
    "moisture_level": 45.5,
    "notes": "Test reading"
  }'
```

## API Response

### Success (200 OK)
```json
{
  "success": true,
  "reading_id": "uuid-here",
  "sensor_name": "Garden Bed 1",
  "status": "Optimal"
}
```

### Error Responses

**Sensor Not Found (404)**
```json
{
  "error": "Sensor not found or inactive"
}
```

**Invalid Data (400)**
```json
{
  "error": "Moisture level must be between 0 and 100"
}
```

## Moisture Status Interpretation

The app automatically determines the status based on moisture level:

- **Low - Water needed**: 0-29%
- **Optimal**: 30-70%
- **High - Reduce watering**: 71-100%

## Tips for Best Results

1. **Regular Intervals**: Send readings every 5-30 minutes for best tracking
2. **Calibration**: Calibrate your sensor for your specific soil type
3. **Power Management**: Use deep sleep modes on ESP32/Arduino to save battery
4. **Error Handling**: Implement retry logic in case of network failures
5. **Testing**: Test with cURL first before programming your device

## Troubleshooting

### "Sensor not found or inactive"
- Verify you're using the correct sensor code from the app
- Check that the sensor is marked as "Active" in the app
- Ensure the sensor code matches exactly (case-sensitive)

### "Failed to connect"
- Verify your device has internet connectivity
- Check that the API endpoint URL is correct
- Ensure your firewall allows outbound HTTPS connections

### Readings not appearing
- Check the sensor's "Last reading" timestamp in the app
- Verify the moisture_level is between 0 and 100
- Check your device's serial output for error messages

## Security Notes

- Sensor codes are unique and act as authentication
- Keep your sensor codes private
- You can delete and recreate sensors if a code is compromised
- The API endpoint does not require additional authentication

## Support

For issues or questions about sensor integration, please refer to the main AgroEye documentation or contact support.
