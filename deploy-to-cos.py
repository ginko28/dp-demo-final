#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云COS部署脚本
用于快速部署HCI研究实验工具到腾讯云COS
"""

import os
import sys
import json
from pathlib import Path
import requests

def check_dependencies():
    """检查依赖包"""
    try:
        import cos
        print("✅ cos-python-sdk-v5 已安装")
    except ImportError:
        print("❌ 需要安装 cos-python-sdk-v5")
        print("请运行: pip install cos-python-sdk-v5")
        return False
    return True

def create_config():
    """创建配置文件"""
    config = {
        "secret_id": "",
        "secret_key": "",
        "region": "ap-guangzhou",
        "bucket_name": "",
        "cdn_domain": ""
    }
    
    print("=== 腾讯云COS配置 ===")
    print("请按提示填写配置信息：")
    
    config["secret_id"] = input("SecretId: ").strip()
    config["secret_key"] = input("SecretKey: ").strip()
    config["region"] = input("地域 (默认: ap-guangzhou): ").strip() or "ap-guangzhou"
    config["bucket_name"] = input("存储桶名称: ").strip()
    config["cdn_domain"] = input("CDN域名 (可选): ").strip()
    
    # 保存配置
    with open("cos_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print("✅ 配置已保存到 cos_config.json")
    return config

def load_config():
    """加载配置文件"""
    if os.path.exists("cos_config.json"):
        with open("cos_config.json", "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        return create_config()

def upload_files(config):
    """上传文件到COS"""
    try:
        from qcloud_cos import CosConfig, CosS3Client
        
        # 初始化配置
        cos_config = CosConfig(
            Region=config["region"],
            SecretId=config["secret_id"],
            SecretKey=config["secret_key"]
        )
        
        # 创建客户端
        client = CosS3Client(cos_config)
        
        # 要上传的文件列表
        files_to_upload = [
            "index.html",
            "style.css", 
            "script.js"
        ]
        
        # 上传主文件
        print("开始上传文件...")
        for file_name in files_to_upload:
            if os.path.exists(file_name):
                with open(file_name, 'rb') as f:
                    response = client.put_object(
                        Bucket=config["bucket_name"],
                        Body=f,
                        Key=file_name,
                        ContentType='text/html' if file_name.endswith('.html') else 
                               'text/css' if file_name.endswith('.css') else 
                               'application/javascript'
                    )
                print(f"✅ 已上传: {file_name}")
            else:
                print(f"❌ 文件不存在: {file_name}")
        
        # 上传图片文件夹
        images_dir = Path("images")
        if images_dir.exists():
            print("上传图片文件...")
            for image_file in images_dir.glob("*"):
                if image_file.is_file():
                    with open(image_file, 'rb') as f:
                        response = client.put_object(
                            Bucket=config["bucket_name"],
                            Body=f,
                            Key=f"images/{image_file.name}",
                            ContentType='image/png' if image_file.suffix == '.png' else 'image/jpeg'
                        )
                    print(f"✅ 已上传: images/{image_file.name}")
        
        print("✅ 所有文件上传完成！")
        
        # 显示访问地址
        bucket_url = f"https://{config['bucket_name']}.cos.{config['region']}.myqcloud.com"
        print(f"\n🌐 网站访问地址:")
        print(f"直接访问: {bucket_url}")
        if config["cdn_domain"]:
            print(f"CDN访问: https://{config['cdn_domain']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 上传失败: {str(e)}")
        return False

def enable_static_website(config):
    """启用静态网站托管"""
    try:
        from qcloud_cos import CosConfig, CosS3Client
        
        cos_config = CosConfig(
            Region=config["region"],
            SecretId=config["secret_id"],
            SecretKey=config["secret_key"]
        )
        
        client = CosS3Client(cos_config)
        
        # 配置静态网站
        response = client.put_bucket_website(
            Bucket=config["bucket_name"],
            WebsiteConfiguration={
                'IndexDocument': {
                    'Suffix': 'index.html'
                },
                'ErrorDocument': {
                    'Key': 'index.html'
                }
            }
        )
        
        print("✅ 静态网站托管已启用")
        return True
        
    except Exception as e:
        print(f"❌ 启用静态网站失败: {str(e)}")
        return False

def main():
    """主函数"""
    print("🚀 HCI研究实验工具 - 腾讯云COS部署脚本")
    print("=" * 50)
    
    # 检查依赖
    if not check_dependencies():
        return
    
    # 加载配置
    config = load_config()
    
    # 上传文件
    if upload_files(config):
        # 启用静态网站托管
        enable_static_website(config)
        
        print("\n🎉 部署完成！")
        print("\n📋 后续步骤:")
        print("1. 在腾讯云控制台配置CDN加速（可选）")
        print("2. 测试网站功能是否正常")
        print("3. 分享链接给参与者")
        
        # 保存访问地址
        bucket_url = f"https://{config['bucket_name']}.cos.{config['region']}.myqcloud.com"
        with open("deploy_info.txt", "w", encoding="utf-8") as f:
            f.write(f"部署时间: {os.popen('date').read().strip()}\n")
            f.write(f"存储桶: {config['bucket_name']}\n")
            f.write(f"地域: {config['region']}\n")
            f.write(f"访问地址: {bucket_url}\n")
            if config["cdn_domain"]:
                f.write(f"CDN地址: https://{config['cdn_domain']}\n")
        
        print(f"\n📝 部署信息已保存到 deploy_info.txt")
    else:
        print("❌ 部署失败，请检查配置和网络连接")

if __name__ == "__main__":
    main() 