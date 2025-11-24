import SwiftUI
import CoreImage.CIFilterBuiltins // 用于生成 QR Code

struct ContentView: View {
    @State private var urlInput = ""
    @State private var timeMode: TimeMode = .auto
    @State private var manualDate = Date()
    @State private var qrCodeImage: UIImage?
    @State private var showAlert = false
    @State private var alertMessage = ""

    enum TimeMode: String, CaseIterable, Identifiable {
        case auto, manual
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // 顶部提示
                    NoteView()

                    // 链接输入
                    CardView(title: "课程详情链接") {
                        TextField(
                            "https://ccc.nottingham.edu.cn/study/home/details?id=xxxx",
                            text: $urlInput,
                            prompt: Text("https://ccc.nottingham.edu.cn/study/home/details?id=xxxx")
                        )
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                    }

                    // 时间模式
                    CardView(title: "时间模式") {
                        Picker("模式", selection: $timeMode) {
                            ForEach(TimeMode.allCases) { mode in
                                Text(mode == .auto ? "自动" : "手动")
                                    .tag(mode)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())

                        if timeMode == .manual {
                            DatePicker(
                                "签到时间",
                                selection: $manualDate,
                                displayedComponents: [.date, .hourAndMinute]
                            )
                            .datePickerStyle(.compact)
                            .padding(.top, 8)
                        }
                    }

                    // 生成按钮
                    Button("生成签到二维码") {
                        generateQRCode()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(.primary) // 配合 Liquid Glass 的强调色

                    // 二维码预览
                    if let image = qrCodeImage {
                        VStack {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 300, height: 300)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .shadow(radius: 8)
                        }
                        .padding()
                    }
                }
                .padding(.horizontal)
            }
            .navigationTitle("UNNC中国文化课签到")
            .navigationBarTitleDisplayMode(.inline)
            .alert("提示", isPresented: $showAlert) {
                Button("确定") { }
            } message: {
                Text(alertMessage)
            }
        }
        .onAppear {
            // 设置默认手动时间为当前时间
            manualDate = Date()
        }
    }

    private func extractScheduleId(from url: String) -> String? {
        guard let url = URL(string: url) else { return nil }
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        return components?.queryItems?.first { $0.name == "id" || $0.name == "scheduleId" }?.value
    }

    private func generateQRCode() {
        guard !urlInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            alertMessage = "请先粘贴课程链接"
            showAlert = true
            return
        }

        guard let scheduleId = extractScheduleId(from: urlInput) else {
            alertMessage = "无法提取 scheduleId，请检查链接是否包含 id= 或 scheduleId="
            showAlert = true
            return
        }

        let timestamp: Int64
        if timeMode == .auto {
            timestamp = Int64(Date().addingTimeInterval(60).timeIntervalSince1970 * 1000)
        } else {
            timestamp = Int64(manualDate.timeIntervalSince1970 * 1000)
        }

        let attendanceURL = "https://ccc.nottingham.edu.cn/study/attendance?scheduleId=\(scheduleId)&time=\(timestamp)"
        qrCodeImage = generateQRCode(from: attendanceURL)
    }

    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.setValue(Data(string.utf8), forKey: "inputMessage")

        guard let outputImage = filter.outputImage,
              let cgimg = context.createCGImage(outputImage, from: outputImage.extent) else { return nil }

        let size = CGSize(width: 300, height: 300)
        UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
        defer { UIGraphicsEndImageContext() }

        let colorDark = UIColor.white
        let colorLight = UIColor(hex: 0x10263B)

        // 绘制背景（深色）
        colorLight.setFill()
        UIRectFill(CGRect(origin: .zero, size: size))

        // 绘制 QR Code 白色模块
        let ciImage = CIImage(cgImage: cgimg)
        let coloredCI = ciImage.applyingFilter("CIFalseColor", parameters: [
            "inputColor0": CIColor(color: colorLight),
            "inputColor1": CIColor(color: colorDark)
        ])

        guard let coloredCG = context.createCGImage(coloredCI, from: coloredCI.extent) else { return nil }
        let qrImage = UIImage(cgImage: coloredCG)
        let drawRect = CGRect(x: (size.width - 240) / 2, y: (size.height - 240) / 2, width: 240, height: 240)
        qrImage.draw(in: drawRect)

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    private func saveImageToPhotos(_ image: UIImage) {
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        // 可加成功提示
    }
}

// MARK: - 辅助 View
struct NoteView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("重要提示：仅限 eduroam / UNNC-living / UNNC_IPSec VPN 环境使用")
                .font(.caption)
            Link("使用步骤详见教程", destination: URL(string: "https://github.com/byronwang2005/CCC-Attendance-QRcode-Generator")!)
                .font(.caption)
                .foregroundStyle(.tint)
        }
        .padding()
        .background(Color.accentColor.opacity(0.1))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.accentColor, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct CardView<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
            content
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.sRGB, white: 0.8, opacity: 1), lineWidth: 1)
        )
        .shadow(radius: 4)
    }
}

// MARK: - 扩展
extension UIColor {
    convenience init(hex: Int, alpha: CGFloat = 1.0) {
        let red = CGFloat((hex >> 16) & 0xFF) / 255.0
        let green = CGFloat((hex >> 8) & 0xFF) / 255.0
        let blue = CGFloat(hex & 0xFF) / 255.0
        self.init(red: red, green: green, blue: blue, alpha: alpha)
    }
}

// MARK: - 预览
#Preview {
    ContentView()
        .preferredColorScheme(.light)
}
