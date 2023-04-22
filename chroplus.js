window.onload = function(){
    console.log('插件进入')

    if (window.location.href.indexOf('http://acm.hdu.edu.cn/') != -1) {
        setTimeout(hangdianOj,500)
    }
};

const BASE_URL = 'http://acm.hdu.edu.cn/'
const SUBMIT_PAGE_URL = 'submit.php?pid='
const STATUS_PAGE_URL = 'status.php'
const USER_ACCOUNT = '13130120109'
const QUESTION_ID = '1003'
const LOCAL_STORAGE_TASK_KEY = 'computeTask'
const INITIAL_TASK = {
    questionId: QUESTION_ID,
    // 20M 
    maxGuess:  1024 * 1024 * 20,
    minGuess: 0,
    currentGuess: 0,
    dataLen: 444223,
    data:[50,48,10,57,57,57,57,57,32,51,55,50,32,52,57],
    submitCount: 0,
    resultCount: 0,
    minDataGuess: 0,
    maxDataGuess: 256,
    reset: 0,
    finished: 0
}



function hangdianOj() {
    console.log('hdoj')

    // 查看当前计算状态
    let taskStr = localStorage.getItem(LOCAL_STORAGE_TASK_KEY);
    if (!taskStr) {
       reset()
       return
    }
    let task = JSON.parse(taskStr)
    if (task.reset == 1) {
        reset()
    }
    if (task.finished) {
        return
    }
    if (task.dataLen != 0) {
       doGuessData()
    } else {
       doGuessDataLen()
    }
   
}

function reset() {
    let initialTask = INITIAL_TASK
    localStorage.setItem(LOCAL_STORAGE_TASK_KEY,JSON.stringify(initialTask))
    // refresh
    gotoSubmitPage()
}

function doGuessDataLen() {
    let pageUrl =  window.location.href;
    // 提交页面
    if (pageUrl.indexOf('submit.php') != -1) {
        doSubmitPage()
    }
    // 结果页面
    if (pageUrl.indexOf('status.php') != -1) {
        doFindResult()
    }
}



function doGuessData() {
    let pageUrl =  window.location.href;
    // 提交页面
    if (pageUrl.indexOf('submit.php') != -1) {
        doSubmitPageData()
    }
    // 结果页面
    if (pageUrl.indexOf('status.php') != -1) {
        doFindResultData()
    }
}

/**
 * 提交代码来推断某字节值
 */
function doSubmitPageData() {
    let taskStr = localStorage.getItem(LOCAL_STORAGE_TASK_KEY);
    let task = JSON.parse(taskStr)

    // 可加校验,如果提交次数和结果次数不一致则重启
    if (task.submitCount != task.resultCount) {
        if (task.resultCount == task.submitCount -1) {
            goToStatusPage()
        } else {
            reset()
            gotoSubmitPage()
        }
    }

    // 猜当前值
    task.currentGuess = Math.floor((task.minDataGuess + task.maxDataGuess)/2)
    task.submitCount += 1
    localStorage.setItem(LOCAL_STORAGE_TASK_KEY,JSON.stringify(task))

    console.log('进入提交页面')
    // 写代码
    let codeAreaList = document.getElementsByName("usercode")
    let codeArea = codeAreaList[0]
    let str =  getDataTemplateCode(task.currentGuess,task.data.length)
    codeArea.textContent = str
   

    // 提交代码
    let inputBtnList = document.getElementsByTagName("input")
    let submitBtn = null
    for (let i =0 ,len = inputBtnList.length; i < len; ++i) {
        if (inputBtnList.item(i).value == 'Submit') {
            submitBtn = inputBtnList[i]
        }
    }
    console.log('submit 按钮',submitBtn)
    
    sleep(1000)
    submitBtn.click()
}


/**
 *  超出 当前字节值的猜测结果
 * @returns 
 */
function doFindResultData() {
    sleep(5000)

    let statusTable = document.getElementsByTagName("table")[2]
    let statusList = statusTable.children[0].children;
   
    // debugger
     // 找到结果行
    let currentStatusLine = null;
    for (let i = 2, len = statusList.length; i < len; ++i ) {
        let statusLine = statusList[i]
        if (isCurrentUserLine(statusLine)) {
            currentStatusLine = statusLine;
            break;
        } 
    }

    let task = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TASK_KEY))

    // 提交结果太久了,滚动到上页了, 最新页不显示了
    if (currentStatusLine == null) {
        if (task.submitCount == task.resultCount) {
            // 进行下次计算
            gotoSubmitPage()
            return;
        } else {
           // 重新计算
           alert('本页查不到数据，重新计算')
           task.reset = 1
           localStorage.setItem(LOCAL_STORAGE_TASK_KEY, JSON.stringify(task))
           gotoSubmitPage()
           return 
        }
    }
    // 如果当前状态是排队中
    if (judgeStatus(currentStatusLine,'Queuing') || judgeStatus(currentStatusLine,'Running')
       || judgeStatus(currentStatusLine,'Compiling')) {
       goToStatusPage();
       return 
    }

    // 判断结果类型
    currentGuessResult = judgeResult(currentStatusLine)
    console.log("当前：" + task.currentGuess + ",runId:" + currentStatusLine.children[0].textContent  +"，结果：" + currentStatusLine.children[2].children[0].textContent + "，应该:" + currentGuessResult )

    if (currentGuessResult < 0) {
        // 需要往小猜
        task.maxDataGuess = task.currentGuess
    } else if (currentGuessResult == 0) {
        // 猜对了长度
        task.data.push(task.currentGuess)
        task.minDataGuess = 0
        task.maxDataGuess = 256
        console.log('猜出数据了', task.dataLen)
        if (task.data.length == task.dataLen) {
            task.finished = 1
        }
    } else {
        // 需要往大猜
        task.minDataGuess = task.currentGuess
    }
    task.resultCount += 1
    localStorage.setItem(LOCAL_STORAGE_TASK_KEY,JSON.stringify(task))
    gotoSubmitPage()
}





function doFindResult() {
    sleep(5000)

    let statusTable = document.getElementsByTagName("table")[2]
    let statusList = statusTable.children[0].children;
   
    // debugger
     // 找到结果行
    let currentStatusLine = null;
    for (let i = 2, len = statusList.length; i < len; ++i ) {
        let statusLine = statusList[i]
        if (isCurrentUserLine(statusLine)) {
            currentStatusLine = statusLine;
            break;
        } 
    }

    let task = JSON.parse(localStorage.getItem(LOCAL_STORAGE_TASK_KEY))

    // 提交结果太久了,滚动到上页了, 最新页不显示了
    if (currentStatusLine == null) {
        if (task.submitCount == task.resultCount) {
            // 进行下次计算
            gotoSubmitPage()
            return;
        } else {
           // 重新计算
           alert('本页查不到数据，重新计算')
           task.reset = 1
           localStorage.setItem(LOCAL_STORAGE_TASK_KEY, JSON.stringify(task))
           gotoSubmitPage()
           return 
        }
    }
    // 如果当前状态是排队中
    if (judgeStatus(currentStatusLine,'Queuing')) {
       goToStatusPage();
       return 
    }

    // 判断结果类型
    currentGuessResult = judgeResult(currentStatusLine)
    console.log("当前：" + task.currentGuess + ",runId:" + currentStatusLine.children[0].textContent  +"，结果：" + currentStatusLine.children[2].children[0].textContent + "，应该:" + currentGuessResult )

    if (currentGuessResult < 0) {
        // 需要往小猜
        task.maxGuess = task.currentGuess
    } else if (currentGuessResult == 0) {
        // 猜对了长度
        task.dataLen = task.currentGuess
        console.log('猜出长度了', task.dataLen)
    } else {
        // 需要往大猜
        task.minGuess = task.currentGuess
    }
    task.resultCount += 1
    localStorage.setItem(LOCAL_STORAGE_TASK_KEY,JSON.stringify(task))
    sleep(11)
    gotoSubmitPage()
}

function gotoSubmitPage() {
    console.log('转向提交页')
    window.location.href =   window.location.href = BASE_URL + SUBMIT_PAGE_URL + QUESTION_ID
}

function goToStatusPage() {
    console.log('转向提交页')
    window.location.href =   window.location.href = BASE_URL + STATUS_PAGE_URL
}

function judgeResult(statusLine) {
    let statusLineColumnList = statusLine.children;
    let status = statusLineColumnList[2].children[0].textContent;
    if (status == 'Time Limit Exceeded') {
        return 1;
    }
    if (status == 'Output Limit Exceeded') {
        return -1;
    }
    return 0;
}

function judgeStatus(statusLine, status) {
    let statusLineColumnList = statusLine.children;
    let statusLineStatus = statusLineColumnList[2].children[0].textContent;
    return  statusLineStatus == status
}
function isCurrentUserLine(statusLine) {
    let statusLineColumnList = statusLine.children;
    let userInfo = statusLineColumnList[8].children[0].text;
    let questionId = statusLineColumnList[3].children[0].text;
    if ( userInfo == USER_ACCOUNT && questionId == QUESTION_ID) {
        return true
    }
    return false
}


function test() {
    let statusTable = document.getElementsByTagName("table")[2]
    let tdList = statusTable.children[0].children;
    let statusLine = tdList[2]
    let statusLineColumnList = statusLine.children;
    let userInfo = statusLineColumnList[8].children[0].text;
    let questionId = statusLineColumnList[3].children[0].text;
}

function test2() {
    let taskStr = localStorage.getItem('computeTask');
    let task = JSON.parse(taskStr)
    // 猜当前值
    task.reset = 1
    localStorage.setItem('computeTask',JSON.stringify(task))
}

function doSubmitPage() {
    let taskStr = localStorage.getItem(LOCAL_STORAGE_TASK_KEY);
    let task = JSON.parse(taskStr)
    // 猜当前值
    task.currentGuess = Math.floor((task.minGuess + task.maxGuess)/2)
    task.submitCount += 1
    localStorage.setItem(LOCAL_STORAGE_TASK_KEY,JSON.stringify(task))

    console.log('进入提交页面')
    // 写代码
    let codeAreaList = document.getElementsByName("usercode")
    let codeArea = codeAreaList[0]
    let str =  templateCode(task.currentGuess)
    codeArea.textContent = str
   

    // 提交代码
    let inputBtnList = document.getElementsByTagName("input")
    let submitBtn = null
    for (let i =0 ,len = inputBtnList.length; i < len; ++i) {
        if (inputBtnList.item(i).value == 'Submit') {
            submitBtn = inputBtnList[i]
        }
    }
    console.log('submit 按钮',submitBtn)
    
    sleep(1000)
    submitBtn.click()
}


function templateCode(currentGuess) {
    return `#include <cstdio>
    #define MAXLEN 0x7fffffff
    #define MINLEN 0
    char buffer[0x10000];//64KB
    int guess = ${currentGuess};
    // RE
    void equal(void)
    {
        int *ptr = NULL;
        *ptr = 0;// access violation
        double da= 1.0;
        double db = 0.0;
        double dc = da / db;
        int a = 1;
        int b = 0;
        int c = a / b + 1;
    }
    
    // OLE
    void less(void)
    {
        while (true)
        {
            fwrite(buffer, sizeof(char), sizeof(buffer), stdout);
        }
    }
    
    // TLE
    void greater(void)
    {
        while (true)
        {
        }
    }
     
    int main(void)
    {
        int ch;
        int count = 0;
        while ((ch = getchar()) != EOF)
        {
            count++;
        }
        if (count < guess)
        {
            less();
        }
        else if (count == guess)
        {
            equal();
        }
        else
        {
            greater();
        }
        return 0;
    }`
}


function getDataTemplateCode(guessData,currentDataIndex) {
    return `#include <cstdio>
    #define MAXLEN 0x7fffffff
    #define MINLEN 0
    char buffer[0x10000];//64KB

    int guess = ${guessData};
    int skip = ${currentDataIndex};
    // RE
    void equal(void)
    {
        int *ptr = NULL;
        *ptr = 0;// access violation
        double da= 1.0;
        double db = 0.0;
        double dc = da / db;
        int a = 1;
        int b = 0;
        int c = a / b + 1;
    }
    // OLE
    void less(void)
    {
        while (true)
        {
            fwrite(buffer, sizeof(char), sizeof(buffer), stdout);
        }
    }
    // TLE
    void greater(void)
    {
        while (true)
        {
        }
    }
     
    int main(void)
    {
        int ch;
        int count = 0;
        while ((ch = getchar()) != EOF)
        {
            if (count == skip)
            {
                if (ch == guess)
                {
                    equal();
                }
                else if (ch < guess)
                {
                    less();
                }
                else
                {
                    greater();
                }
            }
            count++;
        }
        return 0;
    }`
}




// JS睡眠sleep()
function sleep(numberMillis) {
    var now = new Date();
    var exitTime = now.getTime() + 5000;
    while (true) {
        now = new Date();
        if (now.getTime() > exitTime){
            return;
        }
    }
}