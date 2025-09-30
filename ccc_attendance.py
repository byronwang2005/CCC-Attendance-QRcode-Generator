import qrcode
import matplotlib.pyplot as plt
import datetime


def datetime_to_timestamp(year, month, day, hour, minute):
    """将年月日时分转换为毫秒级时间戳"""
    dt = datetime.datetime(year, month, day, hour, minute)
    return int(dt.timestamp() * 1000)


def erweima(url):
    qr = qrcode.QRCode(
        version=1,  # 二维码的版本，范围从1到40，数字越大，二维码的格子数越多，可存储的信息也越多
        error_correction=qrcode.constants.ERROR_CORRECT_L,  # 纠错级别，L表示约7%的纠错能力
        box_size=10,  # 每个小格子包含的像素数
        border=4,  # 二维码四周留白的格子数
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#FFFFFF", back_color="#10263B")
    plt.imshow(img)
    plt.axis('off')  # 不显示坐标轴
    plt.show()
    # 保存二维码图片
    img.save("qrcode.png")


#main
print("使用教学：")
print("把中国文化课主界面在手机浏览器中打开，长按“查看详情”按钮复制链接，在下方粘贴。")
url=input("请输入链接：")
print("精确签到<测试功能>已自动启用！\n请输入签到时间（24小时制）:")
year = int(input("年: "))
month = int(input("月: "))
day = int(input("日: "))
hour = int(input("时: "))
minute = int(input("分: "))
timestamp = datetime_to_timestamp(year, month, day, hour, minute)
if "https://ccc.nottingham.edu.cn/study/home/details?" in url:
    id = url[52:]
    attendance = f"https://ccc.nottingham.edu.cn/study/attendance?scheduleId={id}&time={timestamp}"
    print(f"生成的签到链接: {attendance}")
    erweima(attendance)
else:
    print("弄错了！不是合法的ccc链接！！！")
   
    
   

#固定2026时间戳
'''
if "https://ccc.nottingham.edu.cn/study/home/details?" in url:
    id=url[52:]
    attendance="https://ccc.nottingham.edu.cn/study/attendance?scheduleId="+id+"&time=1799511064000"
    print(attendance)
    erweima(attendance)
else:
    print("弄错了！不是合法的ccc链接！！！")
'''
    
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