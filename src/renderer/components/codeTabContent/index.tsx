import React, {useRef, useState} from 'react';
import './index.less';
import MonacoEditor from 'react-monaco-editor';
import {useCreation, useMount, useSetState, useUpdateEffect} from 'ahooks';
import codeMode from './codeMode';
import {Modal} from 'antd';
import path from 'path';

const fs = window.require('fs');

interface IProps {
  filePath: string
  onSaveChange?: (needSave: boolean, filePath: string) => void
}

const CodeTabContent: React.FC<IProps> = props => {
  const {filePath, onSaveChange} = props;
  const [codeState, setCodeState] = useSetState<{ codeValue: string, saveValue: string }>({
    codeValue: '',
    saveValue: ''
  });
  const [needSave, setNeedSave] = useState<boolean>(false);
  const code = useCreation(() => ({codeValue: '', saveValue: ''}), []);

  /**
   * 获取文件数据
   */
  const getFileData = async (init?: boolean): Promise<void> => {
    fs.readFile(filePath, {encoding: 'utf8'}, (err: any, data: any) => {
      if (err) return console.error(err);
      setCodeState({
        codeValue: init ? data : code.codeValue,
        saveValue: data
      });
    });
  };
  /**
   * 保存文件
   * @param event
   */
  const saveFileData = (event?: any) => {
    if (!(event.keyCode == 83 && (navigator.platform.match('Mac') ? event.metaKey : event.ctrlKey))) return;
    event.preventDefault();
    if (code.saveValue === code.codeValue) return;
    fs.writeFile(filePath, code.codeValue, {encoding: 'utf8'}, (err: any) => {
      if (err) {
        Modal.error({content: '文件保存失败'});
        return;
      }
      getFileData();
    });
  };
  useUpdateEffect(() => {
    code.saveValue = codeState.saveValue;
    code.codeValue = codeState.codeValue;
    setNeedSave(codeState.codeValue !== codeState.saveValue);
  }, [codeState]);

  useUpdateEffect(() => {
    onSaveChange && onSaveChange(needSave, filePath);
  }, [needSave]);

  useMount(() => {
    getFileData(true);
  });

  return <div className="code-tab-content" onKeyDown={saveFileData}>
    <MonacoEditor
      width="100%"
      theme="vs-light"
      options={{
        selectOnLineNumbers: true
      }}
      onChange={(value) => setCodeState({codeValue: value})}
      editorDidMount={editor => editor.focus()}
      language={codeMode[path.extname(filePath)]}
      value={codeState.codeValue}
    />
  </div>;
};

export default CodeTabContent;
