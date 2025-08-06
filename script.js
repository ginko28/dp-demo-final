// 全局变量
let currentTrial = 1;
const totalTrials = 8;
let allTrialsData = [];
let introSurveyData = null;
let isSubmitting = false; // 添加提交状态标志

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
        appearanceProbability: 0.7, // 70% 概率出现
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
        appearanceProbability: 0.6, // 60% 概率出现
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
        appearanceProbability: 0.8, // 80% 概率出现
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
        // 减小最小间距，让组件可以分布得更开
        const minDistance = 50; // 从100减小到50

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
    const margin = 20; // 减小边距，确保元素更贴近图片边界

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

    // 在图片内部随机选择位置
    const randomX = Math.random() * availableWidth;
    const randomY = Math.random() * availableHeight;

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

            sendDataToFirebase()
                .then(() => {
                    submitButton.textContent = '保存成功！';
                    setTimeout(showThankYouPage, 1000);
                })
                .catch(error => {
                    console.error('Error:', error);
                    submitButton.textContent = '保存失败，请重试';
                    // 重置提交状态，允许重试
                    isSubmitting = false;
                    submitButton.disabled = false;
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

// 保存实验数据
function downloadExperimentData() {
    const experimentData = {
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
        const experimentData = {
            introSurvey: introSurveyData,
            trials: allTrialsData,
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
    // 绑定开场问卷提交事件
    const introForm = document.getElementById('intro-form');
    introForm.addEventListener('submit', handleIntroSubmit);
});

// 在页面加载时初始化变量
document.addEventListener('DOMContentLoaded', () => {
    // 重置试次计数和数据数组
    currentTrial = 1;
    allTrialsData = [];
    totalTrials = 8; // 确保这个值是8
    isSubmitting = false; // 重置提交状态

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