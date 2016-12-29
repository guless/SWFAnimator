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
import SWFBuffer from "./SWFBuffer";
import SWFHeader from "./SWFHeader";
import SWFInfo   from "./SWFInfo";
import Rect      from "./records/Rect";
import TagCode   from "./records/TagCode";
/*< import IParser from "../interface/IParser"; >*/
import ZStream   from "../pako/zlib/zstream";
import Messages  from "../pako/zlib/messages";
import Constants from "../pako/zlib/constants";
import GZHeader  from "../pako/zlib/gzheader";
import Inflate   from "../pako/zlib/inflate";

export default class SWFParser /*< implements IParser >*/ {
    static PARSER_HAS_ERRORED = 0x00;
    static END_OF_FILE = 0x01;
    static INVAILD_HEADER = 0x02;
    static UNSUPPORTED_COMPRESSION = 0x03;
    static UNCOMPRESS_FAILURE = 0x05;
    static UNCOMPRESS_SIZE_ERROR = 0x06;
    static TAG_NOT_COMPLETE = 0x07;
    
    constructor( handler ) {
        this._buffer   = new SWFBuffer(8);
        this._behind   = null;
        this._header   = null;
        this._swfInfo  = null;
        this._tagcode  = null;
        this._taglast  = null;
        this._handler  = handler;
        this._isEnded  = false;
        this._isError  = false;
        
        /// 解压缩器
        this._isZLIBCompressed = false;
        this._isLZMACompressed = false;
        
        /// ZLIB
        this._zStream = null;
    }
    
    get isError() {
        return this._isError;
    }
    
    get isEnded() {
        return this._isEnded;
    }
    
    write( ...chunks ) {
        if ( this._isError ) {
            this._isError = true;
            this._handler && this._handler.onError(SWFParser.PARSER_HAS_ERRORED, "Parser has errored");
            return;
        }
        
        if ( this._isEnded ) {
            this._isError = true;
            this._handler && this._handler.onError(SWFParser.END_OF_FILE, "Encounter the end of file");
            return;
        }
        
        var dataList = [];
        var dataSize = 0;
        
        for ( var i = 0; i < chunks.length; ++i ) {
            var data = chunks[i];
            
            if ( data instanceof ArrayBuffer ) {
                data = new Uint8Array(data);
            }
            
            else if ( data instanceof Uint8Array
                ||    data instanceof Uint8ClampedArray
                ||    data instanceof Uint16Array
                ||    data instanceof Uint32Array
                ||    data instanceof Int8Array
                ||    data instanceof Int16Array
                ||    data instanceof Int32Array
                ||    data instanceof Float32Array
                ||    data instanceof Float64Array
                ||    data instanceof DataView ) {
                    
                data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            }
            
            else {
                throw new TypeError("Require buffer or typed array");
            }
            
            if ( data.length >= 0 ) {
                dataSize += data.length;
                dataList.push(data);
            }
        }
        
        if ( dataSize <= 0 ) {
            return;
        }
        
        for ( var i = 0; i < dataList.length; ++i ) {
            var data = dataList[i];
            
            if ( !this._header ) {
                if ( data.length < this._buffer.remain ) {
                    this._buffer.setBytes(data);
                    continue;
                }
                
                else {
                    var remain = this._buffer.remain;
                    
                    this._buffer.setBytes(data.subarray(0, remain));
                    this._buffer.offset = 0;
                    this._header = this._buffer.getHeader(new SWFHeader());
                    
                    if ( !this._header.isSignatureVaild ) {
                        this._isError = true;
                        this._handler && this._handler.onError(SWFParser.INVAILD_HEADER, "Not a swf header");
                        return;
                    }
                    
                    /// 内存分配。
                    var oldbuf = this._buffer.content;
                    
                    this._buffer = new SWFBuffer(this._behind = new Uint8Array(this._header.length));
                    this._buffer.length = 0;
                    this._buffer.setBytes(oldbuf);
                    
                    /// 初始解压程序。
                    if ( this._header.compression === SWFHeader.LZMA_COMPRESSED ) {
                        this._isLZMACompressed = true;
                        this._isError = true;
                        this._handler && this._handler.onError(SWFParser.UNSUPPORTED_COMPRESSION, "LZMA compression does not supprted yet");
                        return;
                    }
                    
                    if ( this._header.compression === SWFHeader.ZLIB_COMPRESSED ) {
                        this._isZLIBCompressed = true;
                        
                        this._zStream = new ZStream();
                        
                        Inflate.inflateInit2(this._zStream, 0x20 | 0xF);
                        Inflate.inflateGetHeader(this._zStream, new GZHeader());
                        
                        this._zStream.output    = this._behind;
                        this._zStream.next_out  = this._buffer.length;
                        this._zStream.avail_out = this._behind.length - this._buffer.length;
                    }
                    
                    this._handler && this._handler.onHeader(this._header);
                    
                    if ( data.length == remain ) {
                        continue;
                    }
    
                    data = data.subarray(remain);
                }
            } // [END HEADER]
            
            /// ZLIB 解压缩
            if ( this._isZLIBCompressed ) {
                this._zStream.input    = data;
                this._zStream.next_in  = 0;
                this._zStream.avail_in = data.length;
                
                var status = Inflate.inflate(this._zStream, Constants.Z_SYNC_FLUSH);
                
                if ( !(status === Constants.Z_OK || status === Constants.Z_STREAM_END) ) {
                    this._isError = true;
                    this._handler && this._handler.onError(SWFParser.UNCOMPRESS_FAILURE, Messages[status]);
                    return;
                }
                
                this._buffer.length = this._zStream.next_out;
                
                if ( (status === Constants.Z_STREAM_END) ) {
                    if ( (this._buffer.length !== this._header.length) ) {
                        this._isError = true;
                        this._handler && this._handler.onError(SWFParser.UNCOMPRESS_SIZE_ERROR, "Uncompressed size does not match header length");
                        return;
                    }
                    
                    this._isEnded = true;
                }
            }
            
            else if ( this._isLZMACompressed ) {
                this._isError = true;
                this._handler && this._handler.onError(SWFParser.UNSUPPORTED_COMPRESSION, "LZMA compression does not supprted yet");
                return;
            }
            
            else {
                this._buffer.write(data);
            }
            
            if ( !this._swfInfo ) {
                this._swfInfo = this._buffer.trySWFInfo(this._swfInfo);
                if ( !this._swfInfo ) { continue; }
                this._handler && this._handler.onSwfInfo(this._swfInfo);
            }
            
            this.drawTags();
        }
    }
    
    drawTags() {
        while( this._tagcode = (this._taglast || this._buffer.tryTagCode(this._tagcode)) ) {
            if ( this._buffer.remain < this._tagcode.length ) {
                this._taglast = this._tagcode;
                break;
            }
            
            else {
                this._taglast = null;
            }
            
            this._buffer.offset += this._tagcode.length;
            this._handler && this._handler.onSwfTag(this._tagcode);
        }
        
        if ( (this._isEnded) && (this._buffer.remain != 0) ) {
            this._isError = true;
            this._handler && this._handler.onError(SWFParser.TAG_NOT_COMPLETE, "Tag does not complete");
            return;
        }
    }
    
    setHandler( handler ) {
        this._handler = handler;
    }
}