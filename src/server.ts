import { Self, MessageType, MessageListener, Next } from "./types";
import { noop, isNative } from "./utils";
import { Request } from "./reaction";
import Responsable from "./responsable";

type HandlerFn = (req: Request, res: Responsable, next: Next) => Promise<any>;
type ErrorHandler = (err: any, req: Request, res: Responsable) => void;
interface ServerOption {
  self?: Self;
  errorHandler?: ErrorHandler;
}

// 执行函数
class Handler {
  constructor(public type: MessageType, public fn: HandlerFn) {
    this.type = type;
    this.fn = fn;
  }
}

// 默认失败执行函数
const defaultErrorHandler: ErrorHandler = (err, _req, res) => {
  if (!res.anwsered) {
    res.respond(err, false);
  }
};

export default class Server {
  self: Self;
  handlers: Handler[];
  errorHandler: ErrorHandler;
  private _msgListener: MessageListener;

  constructor(option: ServerOption = {}) {
    this.self = option.self ?? self;
    this.handlers = []; // 执行函数集合
    this._msgListener = noop;
    this.errorHandler = option.errorHandler ?? defaultErrorHandler;

    if (!isNative(this.self.postMessage)) {
      throw new TypeError(
        "`self` parameter must contain native `postMessage` method"
      );
    }

    this.open();
  }

  // 开启Server端监听
  open() {
    this._msgListener = this._receiver.bind(this);
    this.self.addEventListener("message", this._msgListener);
  }

  // 关闭Server端监听
  close() {
    this.self.removeEventListener("message", this._msgListener);
    this._msgListener = noop;
  }

  /** 注册监听事件
   * @param {MessageType} type
   * @param {HandlerFn} handler
   */
  public listen(type: MessageType, handler: HandlerFn) {
    this.handlers.push(new Handler(type, handler));
  }

  /** 接收事件信息并处理
   * @param {MessageEvent} event
   */
  private _receiver(event: MessageEvent) {
    debugger;
    const { type, data, _id } = event.data;
    const req = new Request({ type, data, id: _id });
    const res = new Responsable(req, event);

    const handlers = this.handlers.filter((handler) => {
      return handler.type === type;
    });

    let index = 0;

    const next = async (error?: any) => {
      const handler = handlers[index++];
      if (handler) {
        handler.fn(req, res, next); // 执行完毕需要可以返回数据
      }
    };

    next();
  }
}
