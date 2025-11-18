import qrcode
import tkinter as tk
from tkinter import messagebox
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
        ts = int(datetime.datetime.now().timestamp() * 1000 + 60000)
    return f"https://ccc.nottingham.edu.cn/study/attendance?scheduleId={schedule_id}&time={ts}"


def make_qr_image(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=8,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="white", back_color="#10263B")  # 诺丁蓝


# ------------------ GUI 主程序 ------------------
class QRGeneratorApp:
    def __init__(self, root):
        self.root = root
        root.title("UNNC 中国文化课签到二维码生成器")
        root.geometry("640x820")
        root.resizable(False, False)
        root.configure(bg="#f5f7fa")

        # ===== 使用说明（固定顶部）=====
        instruction = (
            "重要提示：\n"
            "• 仅限 eduroam / UNNC-living / UNNC_IPSec VPN 环境使用\n"
            "• 请在课程进行时间段内扫描\n\n"
            "使用步骤：\n"
            "1. 在手机浏览器（非微信）打开：https://ccc.nottingham.edu.cn/study/\n"
            "2. 长按「查看详情」→「复制链接」\n"
            "3. 粘贴下方（格式：.../details?id=xxxx 或 ...scheduleId=xxxx）\n"
            "4. 选择模式 → 点击「生成」→ 立即扫描！\n\n"
            "自动模式：当前时间+1分钟（推荐）｜ 手动模式：自定义时间（24小时制）"
        )
        instr_label = tk.Label(
            root, text=instruction, justify="left", anchor="w",
            bg="#eef2f7", fg="#2c3e50",
            relief="solid", bd=1, padx=10, pady=8, wraplength=600
        )
        instr_label.pack(fill="x", padx=15, pady=(10, 10))

        # ===== 主内容容器（严格控制顺序）=====
        main_frame = tk.Frame(root, bg="#f5f7fa")
        main_frame.pack(fill="both", expand=True, padx=20)

        # --- 链接输入 ---
        tk.Label(main_frame, text="课程详情链接：", bg="#f5f7fa", fg="#2c3e50").pack(anchor='w')
        self.url_entry = tk.Entry(main_frame, width=80, relief="solid", bd=1)
        self.url_entry.pack(pady=(5, 10))
        self.url_entry.bind("<FocusIn>", lambda e: self.url_entry.selection_range(0, 'end'))
        self.url_entry.focus_set()

        # --- 模式选择 ---
        self.mode = tk.StringVar(value="auto")
        mode_frame = tk.Frame(main_frame, bg="#f5f7fa")
        mode_frame.pack()
        tk.Radiobutton(
            mode_frame, text="自动模式（推荐）", variable=self.mode, value="auto",
            command=self.toggle_time_input, bg="#f5f7fa", fg="#2c3e50", selectcolor="#d6eaf8"
        ).pack(side=tk.LEFT, padx=15)
        tk.Radiobutton(
            mode_frame, text="手动模式", variable=self.mode, value="manual",
            command=self.toggle_time_input, bg="#f5f7fa", fg="#2c3e50", selectcolor="#d6eaf8"
        ).pack(side=tk.LEFT, padx=15)

        # --- 手动时间输入框（不 pack，仅创建）---
        self.time_frame = tk.Frame(main_frame, bg="#f5f7fa")
        labels = ["年:", "月:", "日:", "时:", "分:"]
        now = datetime.datetime.now()
        defaults = [now.year, now.month, now.day, now.hour, now.minute]
        self.entries = []
        for i, (lbl, default) in enumerate(zip(labels, defaults)):
            row = i // 3
            col = (i % 3) * 2
            tk.Label(self.time_frame, text=lbl, bg="#f5f7fa", fg="#2c3e50").grid(row=row, column=col, padx=2, pady=4)
            width = 5 if "年" in lbl else 4
            entry = tk.Entry(self.time_frame, width=width, justify="center")
            entry.insert(0, str(default))
            entry.grid(row=row, column=col + 1, padx=2, pady=4)
            self.entries.append(entry)

        # --- 生成按钮 ---
        self.generate_btn = tk.Button(
            main_frame, text="生成签到二维码", command=self.generate_qr,
            bg="#10263B", fg="white", height=2,
            activebackground="#0d1f2f", relief="flat", cursor="hand2"
        )
        self.generate_btn.pack(pady=12)

        # ===== 二维码显示区域（固定底部）=====
        qr_frame = tk.Frame(root, bg="#f5f7fa")
        qr_frame.pack(pady=5)
        self.fig = Figure(figsize=(4.2, 4.2), dpi=100, facecolor='#f5f7fa')
        self.ax = self.fig.add_subplot(111)
        self.ax.axis('off')
        self.ax.set_facecolor('#f5f7fa')
        self.canvas = FigureCanvasTkAgg(self.fig, master=qr_frame)
        canvas_widget = self.canvas.get_tk_widget()
        canvas_widget.config(highlightthickness=1, highlightbackground="#cbd5e0")
        canvas_widget.pack()

    def toggle_time_input(self):
        if self.mode.get() == "manual":
            self.time_frame.pack(pady=8)  # 插入到按钮上方
        else:
            self.time_frame.pack_forget()

    def generate_qr(self):
        url = self.url_entry.get().strip()
        if not url:
            messagebox.showwarning("输入为空", "请先粘贴课程链接！")
            self.url_entry.focus_set()
            return

        if "ccc.nottingham.edu.cn/study/home/details" not in url:
            messagebox.showerror("链接错误", "链接必须来自 UNNC 中国文化课详情页！")
            self.url_entry.config(bg="#ffebee")
            self.root.after(1500, lambda: self.url_entry.config(bg="white"))
            return

        try:
            schedule_id = None
            if "id=" in url:
                schedule_id = url.split("id=")[1].split("&")[0].split("#")[0]
            elif "scheduleId=" in url:
                schedule_id = url.split("scheduleId=")[1].split("&")[0].split("#")[0]

            if not schedule_id or schedule_id == "":
                raise ValueError("无法从链接中提取到有效的 id 或 scheduleId")

            if self.mode.get() == "manual":
                try:
                    manual_time = tuple(int(entry.get()) for entry in self.entries)
                    datetime.datetime(*manual_time)
                except (ValueError, TypeError, OverflowError):
                    messagebox.showerror("时间格式错误", "请检查年月日时分是否填写正确（如：月≤12，日≤31，时<24）")
                    return
                attendance_url = generate_attendance_url(schedule_id, mode='manual', manual_time=manual_time)
            else:
                attendance_url = generate_attendance_url(schedule_id)

            img = make_qr_image(attendance_url)
            self.ax.clear()
            self.ax.imshow(img)
            self.ax.axis('off')
            self.ax.set_facecolor('#f5f7fa')
            self.canvas.draw()
            img.save("qrcode.png")
            messagebox.showinfo("成功！", f"二维码已保存为当前目录下的 qrcode.png\n\n签到链接：\n{attendance_url}")

        except Exception as e:
            messagebox.showerror("错误", f"生成失败：{str(e)}")


# ------------------ 启动 ------------------
if __name__ == "__main__":
    root = tk.Tk()
    app = QRGeneratorApp(root)
    root.mainloop()
