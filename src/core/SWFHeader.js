/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/// @Copyright ~2016 ☜Samlv9☞ and other contributors
/// @MIT-LICENSE | 1.0.0 | http://apidev.guless.com/
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
///                                              }|
///                                              }|
///                                              }|     　 へ　　　 ／|    
///      _______     _______         ______      }|      /　│　　 ／ ／
///     /  ___  |   |_   __ \      .' ____ '.    }|     │　Z ＿,＜　／　　 /`ヽ
///    |  (__ \_|     | |__) |     | (____) |    }|     │　　　　　ヽ　　 /　　〉
///     '.___`-.      |  __ /      '_.____. |    }|      Y　　　　　`　 /　　/
///    |`\____) |    _| |  \ \_    | \____| |    }|    ｲ●　､　●　　⊂⊃〈　　/
///    |_______.'   |____| |___|    \______,'    }|    ()　 v　　　　|　＼〈
///    |=========================================\|    　>ｰ ､_　 ィ　 │ ／／
///    |> LESS IS MORE                           ||     / へ　　 /　ﾉ＜|＼＼
///    `=========================================/|    ヽ_ﾉ　　(_／　 │／／
///                                              }|     7　　　　　　  |／
///                                              }|     ＞―r￣￣`ｰ―＿`
///                                              }|
///                                              }|
/// Permission is hereby granted, free of charge, to any person obtaining a copy
/// of this software and associated documentation files (the "Software"), to deal
/// in the Software without restriction, including without limitation the rights
/// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
/// copies of the Software, and to permit persons to whom the Software is
/// furnished to do so, subject to the following conditions:
///
/// The above copyright notice and this permission notice shall be included in all
/// copies or substantial portions of the Software.
///
/// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
/// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
/// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
/// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
/// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
/// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
/// THE SOFTWARE.
/*< import IStruct from "../interface/IStruct"; >*/
/*< import IReadable from "../interface/IReadable"; >*/
/*< import IWritable from "../interface/IWritable"; >*/

export default class SWFHeader /*< implements IStruct >*/ {
    static UNCOMPRESS      = 0x46; // "FWS"
    static ZLIB_COMPRESSED = 0x43; // "CWS";
    static LZMA_COMPRESSED = 0x5A; // "ZWS";
    static SIGN2 = 0x57;
    static SIGN3 = 0x53;
    
    constructor() {
        this._signature = null;
        this._version = 0;
        this._length  = 0;
    }
    
    get version() {
        return this._version;
    }
    
    get length() {
        return this._length;
    }
    
    get signature() {
        return String.fromCharCode(this._signature[0], this._signature[1], this._signature[2]);
    }
    
    get compression() {
        return this._signature[0];
    }
    
    get isCompressed() {
        return (this._signature[0] === SWFHeader.ZLIB_COMPRESSED || this._signature[0] === SWFHeader.LZMA_COMPRESSED);
    }
    
    get isSignatureVaild() {
        return (this._signature[0] === SWFHeader.UNCOMPRESS || this._signature[0] === SWFHeader.ZLIB_COMPRESSED || this._signature[0] === SWFHeader.LZMA_COMPRESSED)
            && (this._signature[1] === SWFHeader.SIGN2)
            && (this._signature[2] === SWFHeader.SIGN3);
    }
    
    decode( buffer ) {
        this._signature = new Uint8Array(buffer.getBytes(3));
        this._version   = buffer.getUI8();
        this._length    = buffer.getUI32();
    }
    
    encode( buffer ) {
        buffer.setBytes(this._signature);
        buffer.setUI8  (this._version  );
        buffer.setUI32 (this._length   );
    }
    
    toString() {
        return `[SWFHeader signature="${this.signature}", compression=${this.isCompressed}, version=${this.version}, length=${this.length}]`;
    }
}