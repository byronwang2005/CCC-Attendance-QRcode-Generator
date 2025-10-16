import qrcode
import tkinter as tk
from tkinter import messagebox, scrolledtext
import datetime
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure


# ------------------ 工具函数 ------------------
def datetime_to_timestamp(year, month, day, hour, minute):
    dt = datetime.datetime(year, month, day, hour, minute)
    return int(dt.timestamp() * 1000)


def generate_attendance_url(schedule_id, mode='auto', manual_time=None):
    if mode == 'manual' and manual_time:
        ts = datetime_to_timestamp(*manual_time)
    else:
        ts = int(datetime.datetime.now().timestamp() * 1000 + 60000)  # +1分钟防迟到
    return f"https://ccc.nottingham.edu.cn/study/attendance?scheduleId={schedule_id}&time={ts}"


def make_qr_image(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="#FFFFFF", back_color="#10263B")  # 诺丁汉蓝


# ------------------ GUI 主程序 ------------------
class QRGeneratorApp:
    def __init__(self, root):
        self.root = root
        root.title("UNNC中国文化课签到二维码生成器")
        root.geometry("620x780")
        root.resizable(False, False)

        # ===== 使用说明（内嵌！）=====
        instruction = (
            "！！！在eduroam/unnc-living/官方UNNC_IPSec VPN环境下扫描！！！\n"
            "！！！在课程进行时间段内扫描！！！\n\n"
            "📌 使用教学：\n\n"
            "1. 在手机浏览器（不是微信）中打开中国文化课主界面：\n"
            "   https://ccc.nottingham.edu.cn/study/\n\n"
            "2. 找到你要签到的课程，长按「查看详情」按钮，\n"
            "   选择「复制链接地址」。\n\n"
            "3. 复制的链接格式应为：\n"
            "   https://ccc.nottingham.edu.cn/study/home/details?scheduleId=xxxx\n\n"
            "4. 将链接粘贴到下方输入框，选择签到模式，点击「生成」即可！\n"
            "💡 自动模式：适用于95%的情况，请在生成后1分钟内扫描二维码\n"
            "📅 手动模式：自定义签到时间（24小时制）\n\n"
            "✅ 生成后二维码会显示在下方，并自动保存为 qrcode.png"
        )

        # 使用 ScrolledText 显示说明（只读）
        self.instruction_text = scrolledtext.ScrolledText(root, wrap=tk.WORD, height=10, width=80)
        self.instruction_text.insert(tk.END, instruction)
        self.instruction_text.config(state=tk.DISABLED, bg="#f9f9f9", fg="#333")
        self.instruction_text.pack(padx=10, pady=(10, 5))

        # ===== 链接输入 =====
        tk.Label(root, text="📎 请粘贴课程详情链接：").pack(anchor='w', padx=15)
        self.url_entry = tk.Entry(root, width=80)
        self.url_entry.pack(padx=15, pady=5)

        # ===== 模式选择 =====
        self.mode = tk.StringVar(value="auto")
        mode_frame = tk.Frame(root)
        mode_frame.pack(pady=5)
        tk.Radiobutton(mode_frame, text="🤖 自动模式（推荐）", variable=self.mode, value="auto",
                       command=self.toggle_time_input).pack(side=tk.LEFT, padx=10)
        tk.Radiobutton(mode_frame, text="🕒 手动模式", variable=self.mode, value="manual",
                       command=self.toggle_time_input).pack(side=tk.LEFT, padx=10)

        # ===== 手动时间输入框 =====
        self.time_frame = tk.Frame(root)
        tk.Label(self.time_frame, text="年:").grid(row=0, column=0, padx=2)
        self.year_entry = tk.Entry(self.time_frame, width=6)
        self.year_entry.grid(row=0, column=1, padx=2)
        tk.Label(self.time_frame, text="月:").grid(row=0, column=2, padx=2)
        self.month_entry = tk.Entry(self.time_frame, width=4)
        self.month_entry.grid(row=0, column=3, padx=2)
        tk.Label(self.time_frame, text="日:").grid(row=0, column=4, padx=2)
        self.day_entry = tk.Entry(self.time_frame, width=4)
        self.day_entry.grid(row=0, column=5, padx=2)
        tk.Label(self.time_frame, text="时:").grid(row=1, column=0, padx=2)
        self.hour_entry = tk.Entry(self.time_frame, width=4)
        self.hour_entry.grid(row=1, column=1, padx=2)
        tk.Label(self.time_frame, text="分:").grid(row=1, column=2, padx=2)
        self.minute_entry = tk.Entry(self.time_frame, width=4)
        self.minute_entry.grid(row=1, column=3, padx=2)

        # 初始化为当前时间
        now = datetime.datetime.now()
        self.year_entry.insert(0, str(now.year))
        self.month_entry.insert(0, str(now.month))
        self.day_entry.insert(0, str(now.day))
        self.hour_entry.insert(0, str(now.hour))
        self.minute_entry.insert(0, str(now.minute))

        # 默认隐藏手动输入框
        self.time_frame.pack_forget()

        # ===== 生成按钮 =====
        tk.Button(root, text="🚀 生成签到二维码", command=self.generate_qr,
                  bg="#10263B", fg="white", height=2, font=("Arial", 10, "bold")).pack(pady=10)

        # ===== 二维码显示区域 =====
        self.fig = Figure(figsize=(4, 4), dpi=100, facecolor='#f0f0f0')
        self.ax = self.fig.add_subplot(111)
        self.ax.axis('off')
        self.canvas = FigureCanvasTkAgg(self.fig, master=root)
        self.canvas.get_tk_widget().pack(pady=5)

    def toggle_time_input(self):
        if self.mode.get() == "manual":
            self.time_frame.pack(pady=5)
        else:
            self.time_frame.pack_forget()

    def generate_qr(self):
        url = self.url_entry.get().strip()
        if "https://ccc.nottingham.edu.cn/study/home/details?scheduleId=" not in url:
            messagebox.showerror("❌ 链接错误", 
                "链接格式不正确！\n\n"
                "请确保是从「查看详情」复制的完整链接，\n"
                "格式应为：\n"
                "https://ccc.nottingham.edu.cn/study/home/details?scheduleId=xxxx")
            return

        try:
            # 提取 scheduleId（兼容带额外参数的情况）
            base = url.split("scheduleId=")[1]
            schedule_id = base.split("&")[0]  # 只取第一个参数值

            if self.mode.get() == "manual":
                manual_time = (
                    int(self.year_entry.get()),
                    int(self.month_entry.get()),
                    int(self.day_entry.get()),
                    int(self.hour_entry.get()),
                    int(self.minute_entry.get())
                )
                attendance_url = generate_attendance_url(schedule_id, mode='manual', manual_time=manual_time)
            else:
                attendance_url = generate_attendance_url(schedule_id, mode='auto')

            # 生成并显示二维码
            img = make_qr_image(attendance_url)
            self.ax.clear()
            self.ax.imshow(img)
            self.ax.axis('off')
            self.canvas.draw()

            # 保存文件
            img.save("qrcode.png")
            messagebox.showinfo("✅ 成功！", 
                f"二维码已生成并保存为当前目录下的 qrcode.png\n\n"
                f"签到链接：\n{attendance_url}")

        except ValueError as e:
            messagebox.showerror("⚠️ 输入错误", "请检查时间是否填写完整且为有效数字。")
        except Exception as e:
            messagebox.showerror("💥 未知错误", f"生成失败：{str(e)}")


# ------------------ 启动 ------------------
if __name__ == "__main__":
    root = tk.Tk()
    app = QRGeneratorApp(root)
    root.mainloop()