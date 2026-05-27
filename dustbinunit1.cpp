#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

WebSocketsClient webSocket;

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
const char* serverIP = "192.168.1.100"; // Replace with backend IP
const int serverPort = 3000;
String deviceId = "bin_001";

// static location
float lat = 12.9716;
float lng = 77.5946;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("Connected to server");
      {
        DynamicJsonDocument reg(200);
        reg["type"] = "esp32";
        reg["deviceId"] = deviceId;
        String msg;
        serializeJson(reg, msg);
        webSocket.sendTXT(msg);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected!");

  webSocket.begin(serverIP, serverPort, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();

  // replace with actual sensor readings
  int dry = 45;
  int wet = 70;
  int e = 10;

  DynamicJsonDocument doc(256);
  doc["deviceId"] = deviceId;
  doc["capacity"]["dry"] = dry;
  doc["capacity"]["wet"] = wet;
  doc["capacity"]["e_waste"] = e;
  doc["location"]["lat"] = lat;
  doc["location"]["lng"] = lng;

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(json);

  delay(5000);
}
