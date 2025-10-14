import qrcode
import matplotlib.pyplot as plt
import datetime

def datetime_to_timestamp(year, month, day, hour, minute):
    """将年月日时分转换为毫秒级时间戳"""
    dt = datetime.datetime(year, month, day, hour, minute)
    return int(dt.timestamp() * 1000)

def erweima(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#FFFFFF", back_color="#10263B") #诺丁蓝色
    plt.imshow(img)
    plt.axis('off')
    plt.show()
    img.save("qrcode.png")

print("使用教学：")
print("把中国文化课主界面(https://ccc.nottingham.edu.cn/study/)在手机浏览器中打开，长按欲签到课程的“查看详情”按钮复制链接，在下方粘贴。")
print("您所复制链接的格式应为https://ccc.nottingham.edu.cn/study/home/details?scheduleId=xxxx")
url=input("请输入链接：")
if "https://ccc.nottingham.edu.cn/study/home/details?" in url:
    id = url[52:]
    funct=int(input("自动模式（1）/手动模式（2）\n请输入数字（默认自动模式）："))
    if funct==2:
        print("手动签到已启用！\n请输入签到时间（24小时制）:")
        year = int(input("年: "))
        month = int(input("月: "))
        day = int(input("日: "))
        hour = int(input("时: "))
        minute = int(input("分: "))
        timestamp = datetime_to_timestamp(year, month, day, hour, minute)
        attendance = f"https://ccc.nottingham.edu.cn/study/attendance?scheduleId={id}&time={timestamp}"
    else:
        print("自动签到已启用！\n正在读取系统本地时间......")
        local_ms_timestamp = int(datetime.datetime.now().timestamp() * 1000)
        attendance = f"https://ccc.nottingham.edu.cn/study/attendance?scheduleId={id}&time={local_ms_timestamp}"
    print(f"生成的签到链接: {attendance}")
    erweima(attendance)
else:
    print("链接格式有误！请重试一次哦～")









    
#spdpo已经被ban
'''
if "https://spdpo.nottingham.edu.cn/study/home/details/" in url:
    id=url[51:]
    checkin="https://spdpo.nottingham.edu.cn/study/attendance?scheduleId="+id+"&type=1&time=1799511064000"
    checkout="https://spdpo.nottingham.edu.cn/study/attendance?scheduleId="+id+"&type=2&time=1799511064000"
    print(checkin)
    print(checkout)
    erweima(checkin)
    erweima(checkout)
elif "https://ccc.nottingham.edu.cn/study/home/details?" in url:
    id=url[52:]
    attendance="https://ccc.nottingham.edu.cn/study/attendance?scheduleId="+id+"&time=1799511064000"
    print(attendance)
    erweima(attendance)
else:
    print("弄错了！不是ccc也不是spdpo！！！")
'''