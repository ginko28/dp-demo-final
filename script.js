// 全局变量
let currentTrial = 1;
const totalTrials = 20;
let allTrialsData = [];
let introSurveyData = null;
let consentData = null;
let userId = null; // 每位参与者的唯一ID
// 记录实验从页面打开开始的时间
const experimentStartTimestamp = Date.now();
const experimentStartAt = new Date().toISOString();
const experimentStartAtLocal = new Date().toString();
let isSubmitting = false; // 添加提交状态标志
let experimentCompleted = false; // 添加实验完成标志，防止重复提交

// Consent页面处理
document.addEventListener('DOMContentLoaded', function() {
    // 初始化/持久化用户ID
    try {
        const saved = localStorage.getItem('hci_user_id');
        if (saved && typeof saved === 'string' && saved.length > 0) {
            userId = saved;
        } else {
            // 简单易记：6位数字ID
            const num = Math.floor(100000 + Math.random() * 900000).toString();
            userId = num;
            localStorage.setItem('hci_user_id', userId);
        }
    } catch (e) {
        // 兜底：即便 localStorage 不可用也能生成一次性 6 位数字ID
        const num = Math.floor(100000 + Math.random() * 900000).toString();
        userId = num;
    }

    const consentCheckbox = document.getElementById('consent-agree');
    const consentSubmitBtn = document.querySelector('#consent-form .submit-btn');
    const consentForm = document.getElementById('consent-form');
    
    // 监听checkbox变化
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', function() {
            consentSubmitBtn.disabled = !this.checked;
        });
    }
    
    // 处理consent表单提交
    if (consentForm) {
        consentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (consentCheckbox.checked) {
                // 记录用户的consent点击
                consentData = {
                    consentGiven: true,
                    clickedAt: new Date().toISOString(),
                    clickedAtLocal: new Date().toString(),
                    userAgent: navigator.userAgent,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                };
                // 隐藏consent页面，显示开场问卷
                document.getElementById('consent-page').style.display = 'none';
                document.getElementById('intro-survey').style.display = 'flex';
            }
        });
    }
});

// 四种元素类型配置
const elementTypes = {
    coupon: {
        name: '优惠券',
        variants: [
            'coupon_unconditional_unlimited',
            'coupon_unconditional_limited',
            'coupon_conditional_unlimited',
            'coupon_conditional_limited'
        ],
        appearanceProbability: 0.5, // 50% 概率出现
        sizeConfig: {
            minWidth: 30,
            maxWidth: 100,
            minHeight: 30,
            maxHeight: 100
        }
    },
    subscription: {
        name: '订阅组件',
        variants: [
            'subscription_social_proof',
            'subscription_benefit'
        ],
        appearanceProbability: 0.5, // 50% 概率出现
        sizeConfig: {
            minWidth: 40,
            maxWidth: 140,
            minHeight: 40,
            maxHeight: 100
        }
    },
    notification: {
        name: '通知消息',
        variants: [
            'notification_social_proof',
            'notification_scarcity',
            'notification_price'
        ],
        appearanceProbability: 0.5, // 50% 概率出现
        sizeConfig: {
            minWidth: 40,
            maxWidth: 140,
            minHeight: 40,
            maxHeight: 100
        }
    },
    popup: {
        name: '弹窗组件',
        variants: [
            'popup_scarcity_hijack',
            'popup_value_exchange'
        ],
        appearanceProbability: 0.5, // 50% 概率出现
        sizeConfig: {
            minWidth: 30,
            maxWidth: 160,
            minHeight: 30,
            maxHeight: 120
        }
    }
};



// 工具函数：生成随机数
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// 仅用于判定移动端（不影响桌面端逻辑）
function isMobileDevice() {
    const byWidth = typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 768;
    const byTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
    const byUA = typeof navigator !== 'undefined' && /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Opera Mini/i.test(navigator.userAgent);
    return byWidth || byTouch || byUA;
}

// 获取底图实际显示区域
function getBackgroundImageDimensions() {
    const container = document.querySelector('.livestream-background');
    const computedStyle = window.getComputedStyle(container);

    // 获取容器尺寸
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // 由于背景图片使用 background-size: contain，图片会完整显示在容器内
    // 我们需要计算图片的实际显示尺寸
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const imageRatio = img.width / img.height;
            const containerRatio = containerWidth / containerHeight;

            let actualWidth, actualHeight, offsetX, offsetY;

            if (containerRatio > imageRatio) {
                // 图片高度填满容器，宽度按比例缩放
                actualHeight = containerHeight;
                actualWidth = containerHeight * imageRatio;
                offsetX = (containerWidth - actualWidth) / 2;
                offsetY = 0;
            } else {
                // 图片宽度填满容器，高度按比例缩放
                actualWidth = containerWidth;
                actualHeight = containerWidth / imageRatio;
                offsetX = 0;
                offsetY = (containerHeight - actualHeight) / 2;
            }

            resolve({
                width: actualWidth,
                height: actualHeight,
                left: offsetX,
                top: offsetY
            });
        };
        img.src = computedStyle.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
    });
}

// 修改组件间的最小距离
function isPositionOverlapping(newPos, existingPositions) {
    for (let pos of existingPositions) {
        // 移动端进一步减小最小间距，让组件更容易分散
        const minDistance = isMobileDevice() ? 30 : 50;

        const centerDistance = Math.sqrt(
            Math.pow((newPos.left + newPos.width / 2) - (pos.left + pos.width / 2), 2) +
            Math.pow((newPos.top + newPos.height / 2) - (pos.top + pos.height / 2), 2)
        );

        if (centerDistance < minDistance) {
            return true;
        }
    }
    return false;
}

// 修改随机位置生成逻辑，使用区域分割方法
async function generateRandomPosition(containerWidth, containerHeight, elementType) {
    const backgroundDimensions = await getBackgroundImageDimensions();
    const margin = isMobileDevice() ? 10 : 20; // 移动端更小边距，仅影响移动端

    // 获取元素类型的尺寸配置
    const sizeConfig = elementTypes[elementType].sizeConfig;
    const componentWidth = getRandomInt(sizeConfig.minWidth, sizeConfig.maxWidth);
    const componentHeight = getRandomInt(sizeConfig.minHeight, sizeConfig.maxHeight);

    // 计算图片的实际显示区域（相对于容器）
    const imageLeft = backgroundDimensions.left;
    const imageTop = backgroundDimensions.top;
    const imageWidth = backgroundDimensions.width;
    const imageHeight = backgroundDimensions.height;

    // 确保组件不会超出图片边界
    const maxComponentWidth = Math.min(componentWidth, imageWidth - margin * 2);
    const maxComponentHeight = Math.min(componentHeight, imageHeight - margin * 2);

    // 计算可放置区域（图片内部，减去边距）
    const availableWidth = imageWidth - maxComponentWidth - (margin * 2);
    const availableHeight = imageHeight - maxComponentHeight - (margin * 2);

    // 如果可用区域太小，调整组件尺寸
    if (availableWidth <= 0 || availableHeight <= 0) {
        const adjustedWidth = Math.max(imageWidth - margin * 2, 20);
        const adjustedHeight = Math.max(imageHeight - margin * 2, 20);

        return {
            left: Math.round(margin),  // 相对于图片的位置
            top: Math.round(margin),   // 相对于图片的位置
            width: adjustedWidth,
            height: adjustedHeight,
            area: "中中"
        };
    }

    // 在图片内部随机选择位置（移动端采用九宫格分区采样，桌面端保持原逻辑）
    let randomX, randomY;
    if (isMobileDevice()) {
        const gridCols = 3;
        const gridRows = 3;
        const cellW = availableWidth / gridCols;
        const cellH = availableHeight / gridRows;
        const gx = Math.floor(Math.random() * gridCols);
        const gy = Math.floor(Math.random() * gridRows);
        randomX = gx * cellW + Math.random() * cellW;
        randomY = gy * cellH + Math.random() * cellH;
    } else {
        randomX = Math.random() * availableWidth;
        randomY = Math.random() * availableHeight;
    }

    // 确保位置在图片边界内
    const finalLeft = Math.round(imageLeft + margin + randomX);
    const finalTop = Math.round(imageTop + margin + randomY);

    // 验证最终位置不会超出图片边界
    const rightEdge = finalLeft + maxComponentWidth;
    const bottomEdge = finalTop + maxComponentHeight;

    if (rightEdge > imageLeft + imageWidth || bottomEdge > imageTop + imageHeight) {
        // 如果超出边界，调整到安全位置
        return {
            left: Math.round(margin),  // 相对于图片的位置
            top: Math.round(margin),   // 相对于图片的位置
            width: maxComponentWidth,
            height: maxComponentHeight,
            area: "中中"
        };
    }

    return {
        left: Math.round(margin + randomX),  // 相对于图片的位置
        top: Math.round(margin + randomY),   // 相对于图片的位置
        width: maxComponentWidth,
        height: maxComponentHeight,
        area: "随机"
    };
}

// 生成单个元素类型
async function generateElementType(elementType, containerWidth, containerHeight, existingPositions) {
    const config = elementTypes[elementType];

    // 随机决定是否出现
    if (Math.random() > config.appearanceProbability) {
        return null;
    }

    // 随机选择变体
    const selectedVariant = getRandomChoice(config.variants);

    // 增加最大尝试次数，确保有足够的尝试机会找到不重叠的位置
    let position;
    let attempts = 0;
    const maxAttempts = 30; // 增加尝试次数

    do {
        position = await generateRandomPosition(containerWidth, containerHeight, elementType);
        attempts++;
        if (attempts >= maxAttempts) {
            return null; // 如果找不到合适的位置，返回 null
        }
    } while (isPositionOverlapping(position, existingPositions));

    if (position) {
        existingPositions.push(position);
        return {
            type: selectedVariant,
            elementType: elementType,
            position: position,
            present: true
        };
    }

    return null;
}

// 生成单个组的状态（有且仅有一个出现，或者不出现）


// 生成所有元素类型的状态
async function generateTrialState() {
    const container = document.querySelector('.livestream-background');
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const existingPositions = [];
    const generatedState = {};

    // 为每种元素类型生成状态
    for (let elementType in elementTypes) {
        const element = await generateElementType(elementType, containerWidth, containerHeight, existingPositions);

        if (element) {
            // 如果元素出现，记录其信息
            generatedState[element.type] = element;

            // 同时标记该元素类型的其他变体为未出现
            elementTypes[elementType].variants.forEach(variant => {
                if (variant !== element.type) {
                    generatedState[variant] = {
                        type: variant,
                        elementType: elementType,
                        present: false
                    };
                }
            });
        } else {
            // 如果该元素类型不出现，标记所有变体为未出现
            elementTypes[elementType].variants.forEach(variant => {
                generatedState[variant] = {
                    type: variant,
                    elementType: elementType,
                    present: false
                };
            });
        }
    }

    return generatedState;
}

// 修改 createComponentElement 函数以设置组件尺寸
async function createComponentElement(componentData) {
    if (!componentData.present) {
        return null;
    }

    const element = document.createElement('img');
    element.src = `images/${componentData.type}.png`;
    element.alt = componentData.type;
    element.className = `livestream-element ${componentData.type}`;

    // 获取背景图片尺寸信息
    const backgroundDimensions = await getBackgroundImageDimensions();
    
    // 将相对于图片的位置转换为相对于容器的位置
    const containerLeft = backgroundDimensions.left + componentData.position.left;
    const containerTop = backgroundDimensions.top + componentData.position.top;

    // 设置位置和尺寸
    element.style.left = `${containerLeft}px`;
    element.style.top = `${containerTop}px`;
    element.style.width = `${componentData.position.width}px`;
    element.style.height = `${componentData.position.height}px`;
    element.style.position = 'absolute';

    return element;
}

// 渲染试次界面
async function renderTrial(generatedState) {
    const container = document.querySelector('.livestream-background');

    // 清空现有组件
    const existingComponents = container.querySelectorAll('.livestream-element');
    existingComponents.forEach(el => el.remove());

    // 添加新组件
    for (let componentType in generatedState) {
        const componentData = generatedState[componentType];
        const element = await createComponentElement(componentData);
        if (element) {
            container.appendChild(element);
        }
    }

    // === 新增：插入缩放同步的固定按钮 ===
    // 获取底图显示区域和缩放比例
    const backgroundDimensions = await getBackgroundImageDimensions();
    const bgImg = new Image();
    bgImg.src = 'images/background.png';
    await new Promise(resolve => { bgImg.onload = resolve; });
    const widthRatio = backgroundDimensions.width / bgImg.width;
    const heightRatio = backgroundDimensions.height / bgImg.height;

    // 获取按钮原始像素
    const commentImg = new Image();
    commentImg.src = 'images/comment.png';
    await new Promise(resolve => { commentImg.onload = resolve; });
    const cartImg = new Image();
    cartImg.src = 'images/shopping_cart.png';
    await new Promise(resolve => { cartImg.onload = resolve; });

    // 你可以调整以下原始像素位置
    const commentOriginLeft = 30; // 以background.png左上角为原点
    const commentOriginTop = 1334;
    const cartOriginLeft = 425;
    const cartOriginTop = 1334;

    // 计算缩放后的位置和尺寸
    const commentLeft = backgroundDimensions.left + commentOriginLeft * widthRatio;
    const commentTop = backgroundDimensions.top + commentOriginTop * heightRatio;
    const commentWidth = commentImg.width * widthRatio;
    const commentHeight = commentImg.height * heightRatio;

    const cartLeft = backgroundDimensions.left + cartOriginLeft * widthRatio;
    const cartTop = backgroundDimensions.top + cartOriginTop * heightRatio;
    const cartWidth = cartImg.width * widthRatio;
    const cartHeight = cartImg.height * heightRatio;

    // 创建评论按钮
    const commentBtn = document.createElement('img');
    commentBtn.src = 'images/comment.png';
    commentBtn.alt = 'comment';
    commentBtn.className = 'livestream-element fixed-btn comment-btn';
    commentBtn.style.position = 'absolute';
    commentBtn.style.left = `${commentLeft}px`;
    commentBtn.style.top = `${commentTop}px`;
    commentBtn.style.width = `${commentWidth}px`;
    commentBtn.style.height = `${commentHeight}px`;
    commentBtn.addEventListener('click', handleComponentClick);
    container.appendChild(commentBtn);

    // 创建购物车按钮
    const cartBtn = document.createElement('img');
    cartBtn.src = 'images/shopping_cart.png';
    cartBtn.alt = 'shopping_cart';
    cartBtn.className = 'livestream-element fixed-btn cart-btn';
    cartBtn.style.position = 'absolute';
    cartBtn.style.left = `${cartLeft}px`;
    cartBtn.style.top = `${cartTop}px`;
    cartBtn.style.width = `${cartWidth}px`;
    cartBtn.style.height = `${cartHeight}px`;
    cartBtn.addEventListener('click', handleComponentClick);
    container.appendChild(cartBtn);

    // 给所有动态组件绑定点击事件
    const allComponents = container.querySelectorAll('.livestream-element');
    allComponents.forEach(el => {
        el.addEventListener('click', handleComponentClick);
    });
}

// 动态生成组件的函数
function generateLivestreamElements() {
    const container = document.querySelector('.livestream-background');

    // 定义所有组件及其变种
    const elements = [
        { name: 'coupon', variants: ['unconditional_unlimited', 'unconditional_limited', 'conditional_unlimited', 'conditional_limited'] },
        { name: 'subscription', variants: ['social_proof', 'benefit'] },
        { name: 'notification', variants: ['social_proof', 'scarcity', 'price'] },
        { name: 'popup', variants: ['scarcity_hijack', 'value_exchange'] }
    ];

    // 遍历组件和变种，动态生成图片
    elements.forEach(element => {
        element.variants.forEach(variant => {
            const img = document.createElement('img');
            img.src = `images/${element.name}_${variant}.png`; // 图片路径
            img.alt = `${element.name} - ${variant}`;
            img.classList.add('livestream-element', element.name, `${element.name}-${variant}`);
            container.appendChild(img);
        });
    });
}

// 调用函数生成组件
generateLivestreamElements();

// 更新进度指示器
function updateProgressIndicator() {
    const indicator = document.getElementById('progress-indicator');
    indicator.textContent = `第 ${currentTrial} / ${totalTrials} 组`;
}

// 收集问卷数据
function collectSurveyData() {
    return {
        behavior_outcome: document.querySelector('input[name="behavior_outcome"]:checked').value,
        attribution: {
            semantic_cues: document.querySelector('input[name="semantic_cues"]:checked').value,
            visual_cues_size: document.querySelector('input[name="visual_cues_size"]:checked').value,
            visual_cues_position: document.querySelector('input[name="visual_cues_position"]:checked').value
        }
    };
}

// 清空问卷
function clearSurvey() {
    const form = document.getElementById('survey-form');
    form.reset();
}

// 添加显示感谢页面的函数
function showThankYouPage() {
    // 隐藏主内容
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('progress-indicator').style.display = 'none';

    // 显示感谢页面
    document.getElementById('thank-you-page').style.display = 'flex';
}

// 修改 handleFormSubmit 函数
async function handleFormSubmit(event) {
    event.preventDefault();

    // 防止重复提交
    if (isSubmitting) {
        console.log('正在提交中，请勿重复点击');
        return;
    }

    if (currentTrial > totalTrials) {
        console.log('实验已经完成，不再接受新的提交');
        return;
    }

    try {
        // 设置提交状态
        isSubmitting = true;
        const submitButton = document.querySelector('.submit-btn');
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';

        // 检查是否所有必需的单选按钮都已选择
        const requiredInputs = ['behavior_outcome', 'semantic_cues', 'visual_cues_size', 'visual_cues_position'];
        const allSelected = requiredInputs.every(name =>
            document.querySelector(`input[name="${name}"]:checked`)
        );

        if (!allSelected) {
            alert('请完成所有问题后再提交');
            // 重置提交状态
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = '提交评价';
            return;
        }

        // 收集问卷数据
        const surveyData = collectSurveyData();

        // 收集当前界面状态
        const container = document.querySelector('.livestream-background');
        const components = container.querySelectorAll('.livestream-element');
        const backgroundDimensions = await getBackgroundImageDimensions();

        const componentsData = Array.from(components).map(component => {
            // 元素位置现在是相对于容器的，需要转换为相对于图片的
            const containerLeft = parseInt(component.style.left);
            const containerTop = parseInt(component.style.top);
            const componentWidth = parseInt(component.style.width);
            const componentHeight = parseInt(component.style.height);
            
            // 转换为相对于图片的位置
            const componentLeft = containerLeft - backgroundDimensions.left;
            const componentTop = containerTop - backgroundDimensions.top;
            
            // 计算组件中心点（相对于图片）
            const componentCenterX = componentLeft + componentWidth / 2;
            const componentCenterY = componentTop + componentHeight / 2;
            
            const area = calculateArea(componentCenterX, componentCenterY, backgroundDimensions);
            
            // 添加调试信息
            console.log(`组件 ${component.alt} 区域计算:`, {
                '容器位置': { left: containerLeft, top: containerTop },
                '图片相对位置': { left: Math.round(componentLeft), top: Math.round(componentTop) },
                '组件中心X': Math.round(componentCenterX),
                '组件中心Y': Math.round(componentCenterY),
                '图片宽度': Math.round(backgroundDimensions.width),
                '图片高度': Math.round(backgroundDimensions.height),
                '计算区域': area
            });
            
            return {
                type: component.alt,
                position: {
                    left: Math.round(componentLeft),
                    top: Math.round(componentTop),
                    width: componentWidth,
                    height: componentHeight,
                    area: area
                }
            };
        });

        // 构建完整的试次数据
        const trialData = {
            trialNumber: currentTrial,
            components: componentsData,
            survey_responses: surveyData,
            // 出现的全部组件（名称列表）
            appeared_components: (() => {
                const presentFromState = (window.currentTrialState
                    ? Object.values(window.currentTrialState).filter(c => c && c.present).map(c => c.type)
                    : []);
                const extras = [];
                if (container.querySelector('.comment-btn')) extras.push('comment');
                if (container.querySelector('.cart-btn')) extras.push('shopping_cart');
                return Array.from(new Set([...presentFromState, ...extras]));
            })(),
            // 完整生成状态（包含未出现的组件 present=false）
            generated_state: window.currentTrialState || null,
            submissionTime: new Date().toISOString(),
            submissionTimeLocal: new Date().toString() // 添加本地时间
        };

        // 存储到总数据数组
        if (currentTrial <= totalTrials) {
            allTrialsData.push(trialData);
        }

        console.log(`试次 ${currentTrial} 数据:`, trialData);

        if (currentTrial === totalTrials) {
            // 实验完成，提交到Firebase
            submitButton.textContent = '正在保存...';

            allTrialsData = allTrialsData.slice(0, totalTrials);

            Promise.race([
                sendDataToFirebase(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('上传超时')), 12000))
            ])
                .then(() => {
                    submitButton.textContent = '保存成功！';
                    setTimeout(showThankYouPage, 800);
                })
                .catch(error => {
                    console.error('上传失败或超时:', error);
                    submitButton.textContent = '保存失败，正在保存本地备份...';
                    try { downloadExperimentData(); } catch (e) { console.error('本地备份失败', e); }
                    setTimeout(showThankYouPage, 1000);
                });
        } else {
            // 继续下一个试次
            currentTrial++;
            clearSurvey();
            await runTrial(currentTrial);
            // 重置提交状态，允许下一个试次的提交
            isSubmitting = false;
            submitButton.disabled = false;
            submitButton.textContent = '提交评价';
        }
    } catch (error) {
        console.error('Error in form submission:', error);
        // 重置提交状态
        isSubmitting = false;
        const submitButton = document.querySelector('.submit-btn');
        submitButton.disabled = false;
        submitButton.textContent = '提交评价';
    }
}

// 计算区域的辅助函数
function calculateArea(x, y, backgroundDimensions) {
    const width = backgroundDimensions.width;
    const height = backgroundDimensions.height;

    // 确保坐标在有效范围内
    const clampedX = Math.max(0, Math.min(x, width));
    const clampedY = Math.max(0, Math.min(y, height));

    let areaX, areaY;
    if (clampedX < width / 3) areaX = "左";
    else if (clampedX < width * 2 / 3) areaX = "中";
    else areaX = "右";

    if (clampedY < height / 3) areaY = "上";
    else if (clampedY < height * 2 / 3) areaY = "中";
    else areaY = "下";

    return areaX + areaY;
}

// 收集当前界面中所有已出现组件的位置信息（相对于图片坐标系）
async function collectAllComponentsData() {
    const container = document.querySelector('.livestream-background');
    const components = container.querySelectorAll('.livestream-element');
    const backgroundDimensions = await getBackgroundImageDimensions();

    const componentsData = Array.from(components).map(component => {
        const containerLeft = parseInt(component.style.left);
        const containerTop = parseInt(component.style.top);
        const componentWidth = parseInt(component.style.width);
        const componentHeight = parseInt(component.style.height);

        const componentLeft = containerLeft - backgroundDimensions.left;
        const componentTop = containerTop - backgroundDimensions.top;

        const componentCenterX = componentLeft + componentWidth / 2;
        const componentCenterY = componentTop + componentHeight / 2;

        const area = calculateArea(componentCenterX, componentCenterY, backgroundDimensions);

        return {
            type: component.alt,
            position: {
                left: Math.round(componentLeft),
                top: Math.round(componentTop),
                width: componentWidth,
                height: componentHeight,
                area: area
            }
        };
    });

    return componentsData;
}

// 保存实验数据
function downloadExperimentData() {
    const experimentData = {
        experimentStartAt,
        experimentStartAtLocal,
        durationMs: Date.now() - experimentStartTimestamp,
        durationSeconds: Math.round((Date.now() - experimentStartTimestamp) / 1000),
        userId,
        consent: consentData,
        introSurvey: introSurveyData,
        trials: allTrialsData
    };

    const dataStr = JSON.stringify(experimentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const timestamp = Date.now();

    const link = document.createElement('a');
    link.href = url;
    link.download = `hci_experiment_data_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 新增：发送数据到 Firebase 的函数
function sendDataToFirebase() {
    return new Promise((resolve, reject) => {
        // 仅向数据库上传时去除每个 trial 的 generated_state 字段
        const sanitizedTrials = Array.isArray(allTrialsData)
            ? allTrialsData.map(t => {
                const { generated_state, ...rest } = t || {};
                return rest;
            })
            : [];

        const experimentData = {
            experimentStartAt,
            experimentStartAtLocal,
            durationMs: Date.now() - experimentStartTimestamp,
            durationSeconds: Math.round((Date.now() - experimentStartTimestamp) / 1000),
            userId,
            consent: consentData,
            introSurvey: introSurveyData,
            trials: sanitizedTrials,
            userAgent: navigator.userAgent,
            completedAt: new Date().toISOString(),
            completedAtLocal: new Date().toString(), // 添加本地时间
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // 添加时区信息
        };

        const db = firebase.firestore();

        db.collection("results").add(experimentData)
            .then((docRef) => {
                console.log("数据成功发送到 Firebase，文档ID: ", docRef.id);
                resolve();
            })
            .catch((error) => {
                console.error("数据发送到 Firebase 失败: ", error);
                reject(error);
            });
    });
}

// 运行单个试次
async function runTrial(trialNumber) {
    // 首先更新进度指示器
    const indicator = document.getElementById('progress-indicator');
    indicator.textContent = `第 ${trialNumber} / ${totalTrials} 组`;

    console.log(`开始试次 ${trialNumber}`);
    console.log('------------------------');

    // 获取底图尺寸信息
    const backgroundDimensions = await getBackgroundImageDimensions();
    console.log('底图显示区域信息:', {
        left: Math.round(backgroundDimensions.left),
        top: Math.round(backgroundDimensions.top),
        width: Math.round(backgroundDimensions.width),
        height: Math.round(backgroundDimensions.height)
    });

    // 生成随机界面状态
    const generatedState = await generateTrialState();
    // 保存当前试次生成状态，便于提交时记录出现的全部组件
    window.currentTrialState = generatedState;

    // 打印当前出现的组件信息
    console.log('\n当前出现的组件:');
    for (let componentType in generatedState) {
        const component = generatedState[componentType];
        if (component.present) {
            console.log(`
组件: ${component.type}
位置信息 (相对于底图):
- 左边距: ${Math.round(component.position.left)}px
- 上边距: ${Math.round(component.position.top)}px
- 宽度: ${Math.round(component.position.width)}px
- 高度: ${Math.round(component.position.height)}px
------------------------`);
        }
    }

    // 渲染界面
    await renderTrial(generatedState);
    
    // 渲染右侧任务1说明
    renderTask1Instruction();
    
    // 重置点击状态
    hasClickedComponent = false;
}

// 结束实验
function endExperiment() {
    console.log('实验完成！');
    console.log('所有试次数据:', allTrialsData);

    // 隐藏主内容
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('progress-indicator').style.display = 'none';

    // 显示感谢页面
    document.getElementById('thank-you-page').style.display = 'flex';

    // 在控制台输出完整数据
    console.log('='.repeat(50));
    console.log('HCI实验数据汇总');
    console.log('='.repeat(50));
    console.log('参与者完成时间 (UTC):', new Date().toISOString());
    console.log('参与者完成时间 (本地):', new Date().toString());
    console.log('总试次数:', allTrialsData.length);
    console.log('详细数据:');

    allTrialsData.forEach((trial, index) => {
        console.log(`\n--- 试次 ${index + 1} ---`);
        console.log('生成状态:', trial.generatedState);
        console.log('问卷回答:', trial.surveyData);
        console.log('提交时间:', trial.submissionTime);
    });

    console.log('\n完整数据对象:');
    console.log(JSON.stringify(allTrialsData, null, 2));

    // 可选：将数据下载为JSON文件
    sendDataToFirebase();
}

// 下载数据为JSON文件
function downloadDataAsJSON() {
    const dataStr = JSON.stringify(allTrialsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `hci_experiment_data_${new Date().getTime()}.json`;

    // 自动触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    console.log('实验数据已下载为JSON文件');
}

// 初始化实验
async function initializeExperiment() {
    console.log('HCI研究实验工具初始化');

    // 绑定表单提交事件
    const form = document.getElementById('survey-form');
    form.addEventListener('submit', handleFormSubmit);

    // 开始第一个试次
    await runTrial(currentTrial);

    console.log('实验开始！');
}

// 添加处理开场问卷的函数
async function handleIntroSubmit(event) {
    event.preventDefault();

    // 收集开场问卷数据
    introSurveyData = {
        brand_liking: document.querySelector('input[name="brand_liking"]:checked').value,
        purchase_intention: document.querySelector('input[name="purchase_intention"]:checked').value,
        consumption_frequency: document.querySelector('input[name="consumption_frequency"]:checked').value,
        submissionTime: new Date().toISOString(),
        submissionTimeLocal: new Date().toString() // 添加本地时间
    };

    // 隐藏开场问卷
    document.getElementById('intro-survey').style.display = 'none';

    // 显示主实验界面
    document.getElementById('progress-indicator').style.display = 'block';
    document.getElementById('main-content').style.display = 'flex';

    // 开始主实验
    await initializeExperiment();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // Consent页面处理
    const consentCheckbox = document.getElementById('consent-agree');
    const consentSubmitBtn = document.querySelector('#consent-form .submit-btn');
    const consentForm = document.getElementById('consent-form');
    
    // 监听checkbox变化
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', function() {
            consentSubmitBtn.disabled = !this.checked;
        });
    }
    
    // 处理consent表单提交
    if (consentForm) {
        consentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (consentCheckbox.checked) {
                // 记录用户的consent点击
                consentData = {
                    consentGiven: true,
                    clickedAt: new Date().toISOString(),
                    clickedAtLocal: new Date().toString(),
                    userAgent: navigator.userAgent,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                };
                // 隐藏consent页面，显示开场问卷
                document.getElementById('consent-page').style.display = 'none';
                document.getElementById('intro-survey').style.display = 'flex';
            }
        });
    }
    
    // 绑定开场问卷提交事件
    const introForm = document.getElementById('intro-form');
    introForm.addEventListener('submit', handleIntroSubmit);
});

// 在页面加载时初始化变量
document.addEventListener('DOMContentLoaded', () => {
    // 重置试次计数和数据数组
    currentTrial = 1;
    allTrialsData = [];
    isSubmitting = false; // 重置提交状态
    experimentCompleted = false; // 重置实验完成状态

    const surveyForm = document.getElementById('survey-form');
    if (surveyForm) {
        surveyForm.addEventListener('submit', handleFormSubmit);
    }
});

// 调试函数（可在控制台调用）
window.debugExperiment = {
    getCurrentTrialData: () => window.currentTrialState,
    getAllTrialsData: () => allTrialsData,
    skipToEnd: () => {
        currentTrial = totalTrials;
        endExperiment();
    },
    restart: async() => {
        currentTrial = 1;
        allTrialsData = [];
        document.getElementById('main-content').style.display = 'flex';
        document.getElementById('progress-indicator').style.display = 'block';
        document.getElementById('thank-you-page').style.display = 'none';
        await runTrial(currentTrial);
    }
};

console.log('调试工具已加载，可在控制台使用 window.debugExperiment 对象');

// 弹窗DOM生成函数
function showBehaviorModal(options, onSelect) {
    // 移除已有弹窗
    const oldModal = document.getElementById('behavior-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'behavior-modal';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.borderRadius = '12px';
    box.style.padding = '32px 24px';
    box.style.minWidth = '320px';
    box.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
    box.style.textAlign = 'center';

    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '24px';
    title.textContent = options.title;
    box.appendChild(title);

    options.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice.label;
        btn.style.display = 'block';
        btn.style.width = '100%';
        btn.style.margin = '12px 0';
        btn.style.padding = '12px';
        btn.style.fontSize = '16px';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid #3498db';
        btn.style.background = '#f8faff';
        btn.style.cursor = 'pointer';
        btn.onmouseenter = () => btn.style.background = '#eaf3fb';
        btn.onmouseleave = () => btn.style.background = '#f8faff';
        btn.onclick = () => {
            modal.remove();
            onSelect(choice.value);
        };
        box.appendChild(btn);
    });

    modal.appendChild(box);
    document.body.appendChild(modal);
}

// 反馈提示弹窗（右侧浮窗）
function showFeedbackModal(message, onClose) {
    const oldModal = document.getElementById('behavior-modal');
    if (oldModal) oldModal.remove();
    const modal = document.createElement('div');
    modal.id = 'behavior-modal';
    modal.style.position = 'fixed';
    modal.style.right = '40px';
    modal.style.top = '60px';
    modal.style.width = '340px';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.background = 'transparent';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'flex-end';
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.borderRadius = '12px';
    box.style.padding = '32px 24px';
    box.style.width = '100%';
    box.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
    box.style.textAlign = 'center';
    box.style.fontSize = '18px';
    box.textContent = message;
    modal.appendChild(box);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.remove();
        if (onClose) onClose();
    }, 1500);
}

// 评价题弹窗（右侧浮窗）
function showEvaluationModal(onSubmit) {
    const oldModal = document.getElementById('behavior-modal');
    if (oldModal) oldModal.remove();
    const modal = document.createElement('div');
    modal.id = 'behavior-modal';
    modal.style.position = 'fixed';
    modal.style.right = '40px';
    modal.style.top = '60px';
    modal.style.width = '340px';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.background = 'transparent';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'flex-end';
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.borderRadius = '12px';
    box.style.padding = '32px 24px';
    box.style.width = '100%';
    box.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
    box.style.textAlign = 'center';
    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '18px';
    title.textContent = '请根据该界面给您的整体感受，评价您对以下说法的同意程度：';
    box.appendChild(title);
    const questions = [
        '界面上的文字或数字信息（如“库存仅剩1件”、“倒计时”、“直播专享低价/限时价”、“xx正在下单”、“xx关注了主播”、“入会领券”）对我刚刚做第一个问题的行为的影响很大。',
        '元素的视觉大小/尺寸，颜色（如一个很大的“抢购”按钮）对我刚刚做第一个问题的行为的影响很大。',
        '元素的位置（如一个正好在手边的弹窗）对我刚刚做第一个问题的行为的影响很大。'
    ];
    const answers = [null, null, null];
    const likertLabels = ['1<br>完全不同意', '2', '3', '4', '5', '6', '7<br>完全同意'];
    questions.forEach((q, idx) => {
        const qDiv = document.createElement('div');
        qDiv.style.margin = '18px 0 8px 0';
        qDiv.style.fontSize = '15px';
        qDiv.style.textAlign = 'left';
        qDiv.textContent = (idx+1) + '. ' + q;
        box.appendChild(qDiv);
        const likert = document.createElement('div');
        likert.style.display = 'flex';
        likert.style.justifyContent = 'space-between';
        likert.style.marginBottom = '8px';
        likertLabels.forEach((label, val) => {
            const labelDiv = document.createElement('label');
            labelDiv.style.display = 'flex';
            labelDiv.style.flexDirection = 'column';
            labelDiv.style.alignItems = 'center';
            labelDiv.style.fontSize = '13px';
            labelDiv.innerHTML = `<input type="radio" name="eval${idx}" value="${val+1}" style="margin-bottom:4px;">${label}`;
            likert.appendChild(labelDiv);
        });
        box.appendChild(likert);
    });
    const submitBtn = document.createElement('button');
    submitBtn.textContent = '提交';
    submitBtn.style.margin = '18px 0 0 0';
    submitBtn.style.padding = '10px 32px';
    submitBtn.style.fontSize = '16px';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.border = '1px solid #3498db';
    submitBtn.style.background = '#3498db';
    submitBtn.style.color = '#fff';
    submitBtn.style.cursor = 'pointer';
    submitBtn.onclick = () => {
        for (let i = 0; i < 3; i++) {
            const checked = box.querySelector(`input[name="eval${i}"]:checked`);
            if (!checked) {
                alert('请完成所有评价题');
                return;
            }
            answers[i] = checked.value;
        }
        modal.remove();
        onSubmit(answers);
    };
    box.appendChild(submitBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

// 组件类型到弹窗内容的映射
function getBehaviorModalOptions(componentType) {
    switch(componentType) {
        case 'coupon_unconditional_unlimited':
        case 'coupon_unconditional_limited':
        case 'coupon_conditional_unlimited':
        case 'coupon_conditional_limited':
            return {
                title: '您点击了优惠券，请问您想做的是：',
                choices: [
                    { label: '领取优惠券', value: 'accept_offers' },
                    { label: '关闭弹窗/组件', value: 'avoid' }
                ]
            };
        case 'subscription_social_proof':
        case 'subscription_benefit':
            return {
                title: '您点击了订阅悬浮框，请问您想做的是：',
                choices: [
                    { label: '立即关注该主播', value: 'accept_offers' },
                    { label: '查找更多信息来判断该弹窗信息内容是否准确', value: 'verify' },
                    { label: '关闭弹窗/组件', value: 'avoid' }
                ]
            };
        case 'notification_social_proof':
        case 'notification_scarcity':
        case 'notification_price':
            return {
                title: '您点击了提示悬浮框，请问您想做的是：',
                choices: [
                    { label: '购买该弹窗显示的商品', value: 'convert' },
                    { label: '了解该弹窗显示的商品的信息细节', value: 'explore' },
                    { label: '查找更多信息来判断该弹窗信息内容是否准确', value: 'verify' },
                    { label: '关闭弹窗/组件', value: 'avoid' }
                ]
            };
        case 'popup_scarcity_hijack':
        case 'popup_value_exchange':
            return {
                title: '您点击了商品弹窗，请问您想做的是：',
                choices: [
                    { label: '购买该弹窗显示的商品', value: 'convert' },
                    { label: '了解该弹窗显示的商品的信息细节', value: 'explore' },
                    { label: '查找更多信息来判断该弹窗信息内容是否准确', value: 'verify' },
                    { label: '关闭弹窗/组件', value: 'avoid' }
                ]
            };
        case 'shopping_cart':
            return {
                title: '您点击了购物车按钮，请问您想做的是：',
                choices: [
                    { label: '浏览商品列表或点进某个商品看细节', value: 'explore' },
                    { label: '直接购买商品', value: 'convert' },
                    { label: '查找更多信息来判断界面显示信息的准确性，例如查看用户评论、买家秀或商品详情', value: 'verify' }
                ]
            };
        case 'comment':
            return {
                title: '您点击了评论按钮，请问您想做的是：',
                choices: [
                    { label: '寻求帮助', value: 'ask' }
                ]
            };
        default:
            return null;
    }
}

// 只允许一次点击
let hasClickedComponent = false;

function handleComponentClick(e) {
    if (hasClickedComponent) return;
    const el = e.currentTarget;
    let componentType = el.classList.contains('fixed-btn') ? el.alt : el.classList[1];
    // 兼容老组件class
    if (componentType.startsWith('coupon')) componentType = componentType;
    if (componentType.startsWith('subscription')) componentType = componentType;
    if (componentType.startsWith('notification')) componentType = componentType;
    if (componentType.startsWith('popup')) componentType = componentType;
    const modalOptions = getBehaviorModalOptions(componentType);
    if (!modalOptions) return;
    hasClickedComponent = true;
    
    // 记录用户点击的组件类型
    const clickedComponent = componentType;
    
    // 获取组件的位置和尺寸信息
    const getComponentInfo = async () => {
        const backgroundDimensions = await getBackgroundImageDimensions();
        const rect = el.getBoundingClientRect();
        const containerRect = el.parentElement.getBoundingClientRect();
        
        // 计算相对于容器的位置
        const containerLeft = rect.left - containerRect.left;
        const containerTop = rect.top - containerRect.top;
        
        // 转换为相对于图片的位置
        const componentLeft = containerLeft - backgroundDimensions.left;
        const componentTop = containerTop - backgroundDimensions.top;
        
        // 计算组件中心点（相对于图片）
        const componentCenterX = componentLeft + rect.width / 2;
        const componentCenterY = componentTop + rect.height / 2;
        
        // 计算区域（9分）
        const area = calculateArea(componentCenterX, componentCenterY, backgroundDimensions);
        
        return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: Math.round(componentLeft),
            top: Math.round(componentTop),
            area: area
        };
    };
    
    // 如果是comment，直接进入任务2；否则先弹出选择题
    if (clickedComponent === 'comment') {
        // comment直接是ask，直接进入任务2
        renderTask1Feedback();
        setTimeout(async () => {
            const componentInfo = await getComponentInfo();
            renderTask2Evaluation(async (evalAnswers) => {
                const allComponentsData = await collectAllComponentsData();
                const appearedComponents = (() => {
                    const presentFromState = (window.currentTrialState
                        ? Object.values(window.currentTrialState).filter(c => c && c.present).map(c => c.type)
                        : []);
                    const extras = [];
                    const container = document.querySelector('.livestream-background');
                    if (container.querySelector('.comment-btn')) extras.push('comment');
                    if (container.querySelector('.cart-btn')) extras.push('shopping_cart');
                    return Array.from(new Set([...presentFromState, ...extras]));
                })();

                const trialData = {
                    trialNumber: currentTrial,
                    clickedComponent: clickedComponent,
                    behavior_outcome: 'ask',
                    component_info: componentInfo,
                    components: allComponentsData,
                    appeared_components: appearedComponents,
                    generated_state: window.currentTrialState || null,
                    attribution: {
                        semantic_cues: evalAnswers[0],
                        visual_cues_size: evalAnswers[1],
                        visual_cues_position: evalAnswers[2]
                    },
                    submissionTime: new Date().toISOString(),
                    submissionTimeLocal: new Date().toString()
                };
                completeTrial(trialData);
            });
        }, 1200);
    } else {
        // 其他组件先弹出选择题
        showBehaviorModal(modalOptions, async (selectedValue) => {
            // 选择题完成后，显示反馈并进入任务2
            renderTask1Feedback();
            setTimeout(async () => {
                const componentInfo = await getComponentInfo();
                renderTask2Evaluation(async (evalAnswers) => {
                    const allComponentsData = await collectAllComponentsData();
                    const appearedComponents = (() => {
                        const presentFromState = (window.currentTrialState
                            ? Object.values(window.currentTrialState).filter(c => c && c.present).map(c => c.type)
                            : []);
                        const extras = [];
                        const container = document.querySelector('.livestream-background');
                        if (container.querySelector('.comment-btn')) extras.push('comment');
                        if (container.querySelector('.cart-btn')) extras.push('shopping_cart');
                        return Array.from(new Set([...presentFromState, ...extras]));
                    })();

                    const trialData = {
                        trialNumber: currentTrial,
                        clickedComponent: clickedComponent,
                        behavior_outcome: selectedValue,
                        component_info: componentInfo,
                        components: allComponentsData,
                        appeared_components: appearedComponents,
                        generated_state: window.currentTrialState || null,
                        attribution: {
                            semantic_cues: evalAnswers[0],
                            visual_cues_size: evalAnswers[1],
                            visual_cues_position: evalAnswers[2]
                        },
                        submissionTime: new Date().toISOString(),
                        submissionTimeLocal: new Date().toString()
                    };
                    completeTrial(trialData);
                });
            }, 1200);
        });
    }
}

// 完成当前试次
function completeTrial(trialData) {
    console.log(`试次 ${currentTrial} 数据:`, trialData);
    
    // 存储到总数据数组
    allTrialsData.push(trialData);
    
    if (currentTrial === totalTrials) {
        // 实验完成，防止重复提交
        if (experimentCompleted) {
            console.log('实验已完成，忽略重复提交');
            return;
        }
        experimentCompleted = true;
        
        // 立即隐藏主内容，防止用户继续操作
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('progress-indicator').style.display = 'none';
        
        // 显示加载提示
        const survey = document.getElementById('survey-container');
        survey.innerHTML = '<div style="text-align: center; padding: 40px;"><h3>正在保存数据...</h3></div>';
        
        // 提交到Firebase
        sendDataToFirebase()
            .then(() => {
                showThankYouPage();
            })
            .catch(error => {
                console.error('Error:', error);
                // 即使保存失败，也显示感谢页面，避免用户重复提交
                showThankYouPage();
            });
    } else {
        // 继续下一个试次
        currentTrial++;
        setTimeout(() => {
            runTrial(currentTrial);
        }, 1000);
    }
}

// 在右侧问卷区动态渲染内容
function renderTask1Instruction() {
    const survey = document.getElementById('survey-container');
    survey.innerHTML = '';
    const h2 = document.createElement('h2');
    h2.innerHTML = `您将看到20组麦当劳直播间界面，界面由一些小组件构成(如优惠券，信息框，商品弹窗，评论框，商品列表按钮等)，每张图片您将完成两个任务。您的ID是 <b>${userId || ''}</b>。`
    h2.style.fontSize = 'inherit';
    survey.appendChild(h2);
    const task1 = document.createElement('div');
    task1.id = 'task1-instruction';
    task1.style.margin = '18px 0 0 0';
    task1.innerHTML = '<br><b>任务1：</b>当您第一次看到界面时，请<strong>在界面点击</strong>您最想点击/最关注的组件（仅组件&按钮可被点击）。';
    survey.appendChild(task1);
}

function renderTask1Feedback() {
    const survey = document.getElementById('survey-container');
    // 隐藏任务1说明
    const task1 = document.getElementById('task1-instruction');
    if (task1) task1.style.display = 'none';
    // 显示反馈
    let feedback = document.getElementById('task1-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'task1-feedback';
        feedback.style.margin = '18px 0 0 0';
        feedback.style.fontWeight = 'bold';
        feedback.style.color = '#3498db';
        survey.appendChild(feedback);
    }
    feedback.textContent = '您的选择已记录，接下来请完成任务2';
}

function renderTask2Evaluation(onSubmit) {
    const survey = document.getElementById('survey-container');
    // 移除旧的任务2
    let oldTask2 = document.getElementById('task2-evaluation');
    if (oldTask2) oldTask2.remove();
    // 任务2容器
    const task2 = document.createElement('div');
    task2.id = 'task2-evaluation';
    task2.style.margin = '24px 0 0 0';
    task2.innerHTML = '<b>任务2：</b>请根据该界面给您的整体感受，评价您对以下说法的同意程度（1-5 完全不同意-完全同意）：';
    const questions = [
        '界面上的<b>文字或数字信息</b>（如“库存仅剩1件”、“倒计时”、“直播专享低价/限时价”、“xx正在下单”、“xx关注了主播”、“入会领券”）对我刚刚首次点击行为的影响很大。',
        '元素的<b>视觉大小/尺寸</b>和<b>颜色</b>对我刚刚首次点击行为的影响很大。',
        '元素的<b>位置</b>对我刚刚首次点击行为的影响很大。'
    ];
    const likertLabels = ['1<br>完全不同意', '2', '3', '4', '5<br>完全同意'];
    questions.forEach((q, idx) => {
        const qDiv = document.createElement('div');
        qDiv.style.margin = '18px 0 8px 0';
        qDiv.style.fontSize = '15px';
        qDiv.style.textAlign = 'left';
        qDiv.innerHTML = (idx + 1) + '. ' + q;
        task2.appendChild(qDiv);
        const likert = document.createElement('div');
        likert.style.display = 'flex';
        likert.style.justifyContent = 'space-between';
        likert.style.marginBottom = '8px';
        likertLabels.forEach((label, val) => {
            const labelDiv = document.createElement('label');
            labelDiv.style.display = 'flex';
            labelDiv.style.flexDirection = 'column';
            labelDiv.style.alignItems = 'center';
            labelDiv.style.fontSize = '13px';
            labelDiv.innerHTML = `<input type="radio" name="eval${idx}" value="${val+1}" style="margin-bottom:4px;">${label}`;
            likert.appendChild(labelDiv);
        });
        task2.appendChild(likert);
    });
    const submitBtn = document.createElement('button');
    submitBtn.textContent = '提交';
    submitBtn.style.margin = '18px 0 0 0';
    submitBtn.style.padding = '10px 32px';
    submitBtn.style.fontSize = '16px';
    submitBtn.style.borderRadius = '8px';
    submitBtn.style.border = '1px solid #3498db';
    submitBtn.style.background = '#3498db';
    submitBtn.style.color = '#fff';
    submitBtn.style.cursor = 'pointer';
    submitBtn.onclick = () => {
        const answers = [];
        for (let i = 0; i < 3; i++) {
            const checked = task2.querySelector(`input[name="eval${i}"]:checked`);
            if (!checked) {
                alert('请完成所有评价题');
                return;
            }
            answers[i] = checked.value;
        }
        onSubmit(answers);
    };
    task2.appendChild(submitBtn);
    survey.appendChild(task2);
}