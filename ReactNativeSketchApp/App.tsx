import React, { Component, createRef } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
  Dimensions,
  Image,
  Animated, // 追加
} from "react-native";
import Canvas from "react-native-canvas";

const ITEM_WIDTH = Dimensions.get("window").width - 50;
const SERVER_URL = "http://192.168.11.7:8080";

interface AppState {
  previousX: number | string;
  previousY: number | string;
  currentX: number | string;
  currentY: number | string;
  drawFlag: boolean;
  similarity: string;
  blueButtonColor: string;
  redButtonColor: string;
  blue_similarity: string;
  red_similarity: string;
}

export default class App extends Component<{}, AppState> {
  private canvas: React.RefObject<Canvas>;
  private saveInterval: NodeJS.Timeout | null = null;
  private shakeAnimation: Animated.Value; // 追加

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
      blue_similarity: "",
      red_similarity: "",
    };
    this.canvas = createRef();
    this.onTouch = this.onTouch.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.clear = this.clear.bind(this);
    this.saveSketch = this.saveSketch.bind(this);
    this.toggleBlueButtonColor = this.toggleBlueButtonColor.bind(this);
    this.shakeAnimation = new Animated.Value(0); // 追加
  }

  componentDidMount() {
    this.updateCanvas();
    this.startShake(); // 追加
    // this.saveInterval = setInterval(() => {
    //   this.saveSketch();
    //   console.log("Logging every 2 seconds");
    // }, 2000); // 2秒ごとに自動保存
  }
  componentDidUpdate(prevProps: {}, prevState: AppState) {
    if (
      prevState.blue_similarity !== this.state.blue_similarity ||
      prevState.red_similarity !== this.state.red_similarity
    ) {
      this.startShake();
    }
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
      blueButtonColor: this.state.blueButtonColor === "blue" ? "red" : "blue",
    });
  }

  async saveSketch() {
    try {
      const response = await fetch(`${SERVER_URL}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json(); // Parse response as JSON
      console.log(data);

      this.setState({
        blue_similarity: data.similarity_blue.toFixed(1) + "pt",
        red_similarity: data.similarity_red.toFixed(1) + "pt",
      });
      this.setState({
        similarity:
          (data.similarity_blue - data.similarity_red).toFixed(1) + "pt",
      });
    } catch (error) {
      console.error("Error saving sketch:", error);
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
      // console.log(this.state.blueButtonColor);
      const payload = {
        ...data,
        blueButtonColor: this.state.blueButtonColor,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buttonColor: this.state.blueButtonColor,
        }),
      });
      const text = await response.text();
      // console.log(text);
    } catch (error) {
      console.error("Error clearing server data:", error);
    }
  }

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
  startShake() {
    const blueScore = parseFloat(this.state.blue_similarity) || 0;
    const redScore = parseFloat(this.state.red_similarity) || 0;
    const shakeIntensity =
      this.state.blueButtonColor === "blue"
        ? Math.max(0, (redScore - blueScore) / 2)
        : Math.max(0, (blueScore - redScore) / 2); // 修正

    Animated.loop(
      Animated.sequence([
        Animated.timing(this.shakeAnimation, {
          toValue: shakeIntensity,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(this.shakeAnimation, {
          toValue: -shakeIntensity,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }
  render() {
    const shake = this.shakeAnimation.interpolate({
      inputRange: [-10, 10],
      outputRange: [-10, 10],
    });
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: ITEM_WIDTH / 2, height: ITEM_WIDTH / 2 }}>
            <Animated.Image
              source={require("./assets/sinkansenn.png")}
              style={{
                width: 400,
                height: 500,
                marginLeft: ITEM_WIDTH / 10,
                transform: [{ translateX: shake }],
              }}
            />
            <View
              style={{
                marginLeft: ITEM_WIDTH / 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 20, textAlign: "center", marginTop: 40 }}
                >
                  あなたのスコア
                </Text>
                <Text
                  style={{ fontSize: 40, textAlign: "center", marginTop: 5 }}
                >
                  {this.state.blueButtonColor === "blue" &&
                  this.state.blue_similarity
                    ? this.state.blue_similarity
                    : this.state.blueButtonColor === "red" &&
                      this.state.red_similarity
                    ? this.state.red_similarity
                    : "0.0pt"}
                </Text>
              </View>
              <View>
                <Text
                  style={{ fontSize: 20, textAlign: "center", marginTop: 40 }}
                >
                  相手のスコア
                </Text>
                <Text
                  style={{ fontSize: 40, textAlign: "center", marginTop: 5 }}
                >
                  {this.state.blueButtonColor === "blue" &&
                  this.state.red_similarity
                    ? this.state.red_similarity
                    : this.state.blueButtonColor === "red" &&
                      this.state.blue_similarity
                    ? this.state.blue_similarity
                    : "0.0pt"}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1, height: "100%", marginLeft: 70 }}>
            <View
              style={{
                marginTop: 100,
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: 20,
                marginRight: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: "red",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 50,
                  borderColor: "orange",
                  borderWidth: 5,
                }}
                onPress={this.saveSketch}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontWeight: "bold",
                    marginBottom: -3,
                  }}
                >
                  こうげき
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 24,
                    fontWeight: "bold",
                    marginBottom: 3,
                  }}
                >
                  攻撃
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: "blue",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 50,
                  borderColor: "lightblue",
                  borderWidth: 5,
                }}
                onPress={this.clear}
              >
                <Text
                  style={{ color: "white", fontSize: 24, fontWeight: "bold" }}
                >
                  クリア
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                marginTop: 30,
                justifyContent: "flex-end",
                marginRight: 40,
              }}
            >
              <Text>※端末識別用: </Text>
              <TouchableOpacity
                style={[
                  {
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: this.state.blueButtonColor,
                  },
                ]}
                onPress={this.toggleBlueButtonColor}
              ></TouchableOpacity>
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
