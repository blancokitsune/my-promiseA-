class Promise {
  constructor(executor) {
    // 1.参数校验，必须是函数
    if (typeof executor !== 'function') {
      throw new TypeError(
        `TypeError: Promise resolver ${executor} is not a function`
      )
    }

    // 2.初始化值
    this.state = Promise.PENDING // 状态，默认是pending，每一次转为fulfilled、rejected的行为都是不可逆的
    this.value = null // 终值
    this.reason = null // 拒因
    this.onFulfilledCallbacks = [] // 成功回调
    this.onRejectedCallbacks = [] // 失败回调
    // 2.1.帮助resolve和reject获取正确this指向
    this.resolve = this.resolve.bind(this)
    this.reject = this.reject.bind(this)

    // 3.执行Promise履约
    try {
      executor(this.resolve, this.reject)
    } catch (error) {
      this.reject(error)
    }
  }

  resolve(value) {
    // 1.状态改变
    if (this.state === Promise.PENDING) {
      this.state = Promise.FULFILLED
      this.value = value
      // 2.成功回调的执行
      this.onFulfilledCallbacks.forEach((fn) => fn(this.value))
    }
  }

  reject(reason) {
    // 1.状态改变
    if (this.state === Promise.PENDING) {
      this.state = Promise.REJECTED
      this.reason = reason
      // 2.失败回调的执行
      this.onRejectedCallbacks.forEach((fn) => fn(this.reason))
    }
  }

  then(onFulfilled, onRejected) {
    // 1.参数校验
    // 我们常写的情况是，如果不是function的话，那他会将这个值传递下去，你之后再用then调用他还能拿到的
    if (typeof onFulfilled !== 'function') {
      onFulfilled = function (value) {
        return value
      }
    }

    if (typeof onRejected !== 'function') {
      onRejected = function (reason) {
        throw reason
      }
    }

    // 2.执行条件
    // 当状态值是fulfilled或者rejected时，执行相应的函数并传入对应的终值(value)或者拒因(reason)
    // 当promise执行结束后必须被调用

    let promise2 = new Promise((resolve, reject) => {
      if (this.state === Promise.FULFILLED) {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === Promise.REJECTED) {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === Promise.PENDING) {
        this.onFulfilledCallbacks.push((value) => {
          setTimeout(() => {
            try {
              const x = onFulfilled(value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })

        this.onRejectedCallbacks.push((reason) => {
          setTimeout(() => {
            try {
              const x = onRejected(this.reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        })
      }
    })

    return promise2
  }
}
Promise.PENDING = 'pending'
Promise.FULFILLED = 'fulfilled'
Promise.REJECTED = 'reject'

function resolvePromise(promise2, x, resolve, reject) {
  // 1.循环调用自己的情况
  if (promise2 === x) {
    reject(new TypeError('Chaining cycle detected for promise'))
  }

  // 2.x是promise的情况
  let called = false // 标记是否被调用，在x为对象或者为函数时的情况
  if (x instanceof Promise) {
    // 2.1.必须等待x被执行或者拒绝
    // 那也就是then的时候
    // 根据状态，用相同的value或者reason传递
    x.then(
      // 重点： then里的return new Promise如果又有return new Promise咋办，那就一直弄到他没有为止
      (value) => resolvePromise(promise2, value, resolve, reject),
      (reason) => reject(reason)
    )
  }
  // 3.为对象或者函数
  else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    try {
      // 将x.then赋值给then
      const then = x.then
      // 判断有没有then方法
      if (typeof then === 'function') {
        then.call(
          x,
          // 重点： then里的return 带then对象和上面一样可能嵌套好多，那就一直弄到他没有为止
          (value) => {
            if (called) return
            called = true
            resolvePromise(promise2, value, resolve, reject)
          },
          (reason) => {
            if (called) return
            called = true
            reject(reason)
          }
        )
      } else {
        if (called) return
        called = true
        resolve(x)
      }
    } catch (error) {
      if (called) return
      called = true
      reject(error)
    }
  }
  // 3.1.不为对象或者函数，就直接返回就ok了
  else {
    resolve(x)
  }
}
Promise.resolvePromise = resolvePromise
Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}
module.exports = Promise
