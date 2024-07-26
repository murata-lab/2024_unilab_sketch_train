import React, { Component, createRef } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
  Dimensions,
  Image,
} from "react-native";
import Canvas from "react-native-canvas";

const ITEM_WIDTH = Dimensions.get("window").width - 50;
const SERVER_URL = "http://172.20.21.246:8080";

interface AppState {
  previousX: number | string;
  previousY: number | string;
  currentX: number | string;
  currentY: number | string;
  drawFlag: boolean;
  similarity: string;
  blueButtonColor: string;
  redButtonColor: string;
}

export default class App extends Component<{}, AppState> {
  private canvas: React.RefObject<Canvas>;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      previousX: "",
      previousY: "",
      currentX: "",
      currentY: "",
      drawFlag: false,
      similarity: "",
      blueButtonColor: "blue",
      redButtonColor: "red",
    };
    this.canvas = createRef();
    this.onTouch = this.onTouch.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.clear = this.clear.bind(this);
    this.saveSketch = this.saveSketch.bind(this);
    this.toggleBlueButtonColor = this.toggleBlueButtonColor.bind(this);
    this.toggleRedButtonColor = this.toggleRedButtonColor.bind(this);
  }

  componentDidMount() {
    this.updateCanvas();
    // this.saveInterval = setInterval(() => {
    //   this.saveSketch();
    //   console.log("Logging every 2 seconds");
    // }, 2000); // 2秒ごとに自動保存
  }

  componentWillUnmount() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
  }

  updateCanvas() {
    const ctx = this.canvas.current?.getContext("2d");
    if (ctx) {
      const canvas = this.canvas.current;
      if (canvas) {
        const { width, height } = Dimensions.get("window");
        canvas.width = width - 50;
        canvas.height = height - 200;
        ctx.strokeStyle = "rgb(00, 00, 00)";
      }
    }
  }

  toggleBlueButtonColor() {
    this.setState({
      blueButtonColor:
        this.state.blueButtonColor === "blue" ? "lightblue" : "blue",
    });
  }

  toggleRedButtonColor() {
    this.setState({
      redButtonColor: this.state.redButtonColor === "red" ? "pink" : "red",
    });
  }
  async saveSketch() {
    try {
      const response = await fetch(`${SERVER_URL}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blueButtonColor: this.state.blueButtonColor,
          redButtonColor: this.state.redButtonColor,
        }),
      });
      console.log(response);

      const data = await response.json(); // Parse response as JSON
      console.log(data.similarity * data.similarity * 1000); // Log the similarity value
      this.setState({
        similarity: (data.similarity * data.similarity * 1000).toFixed(2) + "%",
      });
    } catch (error) {
      // console.error("Error saving sketch:", error);
    }
  }

  onTouch(e: GestureResponderEvent) {
    this.setState({
      drawFlag: true,
      previousX: e.nativeEvent.locationX,
      previousY: e.nativeEvent.locationY,
    });
  }

  onMove(e: GestureResponderEvent) {
    if (!this.state.drawFlag) return;
    const ctx = this.canvas.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      if (this.state.currentX === "") {
        this.setState({
          currentX: this.state.previousX,
          currentY: this.state.previousY,
        });
      } else {
        this.setState({
          previousX: e.nativeEvent.locationX,
          previousY: e.nativeEvent.locationY,
        });
        ctx.moveTo(Number(this.state.previousX), Number(this.state.previousY));
      }
      ctx.lineTo(Number(this.state.currentX), Number(this.state.currentY));
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";
      ctx.stroke();
      ctx.closePath();
      this.setState({
        currentX: this.state.previousX,
        currentY: this.state.previousY,
      });

      // Send drawing data to the server
      const drawingData = {
        previousX: Number(this.state.previousX),
        previousY: Number(this.state.previousY),
        currentX: Number(this.state.currentX),
        currentY: Number(this.state.currentY),
      };
      this.sendDrawingData(drawingData);
    }
  }

  async sendDrawingData(data: any) {
    try {
      const payload = {
        ...data,
        blueButtonColor: this.state.blueButtonColor,
        redButtonColor: this.state.redButtonColor,
      };

      const response = await fetch(`${SERVER_URL}/draw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      // console.log(text);
    } catch (error) {
      console.error("Error sending drawing data:", error);
    }
  }

  async clearServerData() {
    try {
      const response = await fetch(`${SERVER_URL}/clear`, {
        method: "POST",
      });
      const text = await response.text();
      // console.log(text);
    } catch (error) {
      console.error("Error clearing server data:", error);
    }
  }

  // async clearServerData() {
  //   try {
  //     const payload = {
  //       blueButtonColor: this.state.blueButtonColor,
  //       redButtonColor: this.state.redButtonColor,
  //     };

  //     const response = await fetch(`${SERVER_URL}/clear`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(payload),
  //     });
  //     const text = await response.text();
  //     // console.log(text);
  //   } catch (error) {
  //     console.error("Error clearing server data:", error);
  //   }
  // }

  onTouchEnd() {
    this.setState({
      drawFlag: false,
      previousX: "",
      previousY: "",
      currentX: "",
      currentY: "",
    });
  }

  clear() {
    const ctx = this.canvas.current?.getContext("2d");
    if (ctx) {
      const canvas = this.canvas.current;
      if (canvas) {
        const { width, height } = Dimensions.get("window");
        canvas.width = width - 50;
        canvas.height = height - 200;
        ctx.strokeStyle = "rgb(00, 00, 00)";
      }
    }
    this.clearServerData(); // サーバーのデータもクリア
  }

  render() {
    return (
      <View style={{ flex: 1, paddingTop: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: ITEM_WIDTH / 2, height: ITEM_WIDTH / 2 }}>
            <Image
              source={require("./assets/senga.png")}
              style={{
                width: 500,
                height: 500,
                marginLeft: ITEM_WIDTH / 15,
                marginTop: 25,
              }}
            />
          </View>
          <View style={{ flex: 1, height: "100%", marginLeft: 70 }}>
            <Text
              style={{
                fontSize: 20,
                textAlign: "center",
                marginBottom: 10,
                marginTop: 50,
              }}
            >
              スケッチを描いてね
            </Text>

            <View
              style={{
                width: 500,
                height: 500,
                borderWidth: 2,
                borderColor: "black",
                position: "relative",
              }}
              onTouchStart={this.onTouch}
              onTouchMove={this.onMove}
              onTouchEnd={this.onTouchEnd}
            >
              <Canvas
                ref={this.canvas}
                style={{
                  width: "100%",
                  height: "100%",
                  zIndex: 10,
                }}
              />
            </View>
            <View style={styles.clear}>
              <Text>
                類似度：{this.state.similarity ? this.state.similarity : "0%"}
              </Text>
            </View>
            <TouchableOpacity style={styles.clear} onPress={this.saveSketch}>
              <Text>送信</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clear} onPress={this.clear}>
              <Text>クリア</Text>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                width: 500,
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: this.state.blueButtonColor },
                ]}
                onPress={this.toggleBlueButtonColor}
              >
                <Text style={styles.buttonText}>青ボタン</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: this.state.redButtonColor },
                ]}
                onPress={this.toggleRedButtonColor}
              >
                <Text style={styles.buttonText}>赤ボタン</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  clear: {
    height: 40,
    width: 500,
    borderColor: "black",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  button: {
    height: 40,
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});
