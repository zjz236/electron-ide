import React, {useRef, useState} from 'react';
import './index.less';
import {useMount, useSetState, useUpdateEffect} from 'ahooks';
import {Button, Dropdown, Input, Menu, Modal, Tabs, Tooltip, Tree} from 'antd';
import CodeTabContent from '../components/codeTabContent';
import {CodeOutlined} from '@ant-design/icons';
import {AntTreeNodeSelectedEvent} from 'antd/es/tree';
import 'xterm/css/xterm.css'
import {Terminal} from 'xterm'
import {FitAddon} from 'xterm-addon-fit'
import _ from 'lodash';

const {ipcRenderer, remote} = window.require('electron');
const fs = window.require('fs');
const path = require('path');
const os = require('os')

const {TabPane} = Tabs;
const {dialog} = remote;
const {DirectoryTree} = Tree;

interface DataNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: DataNode[];
}

const updateTreeData = (list: DataNode[], key: React.Key, children: DataNode[]): DataNode[] => {
  return list.map(node => {
    if (node.key === key) {
      return {
        ...node,
        children,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: updateTreeData(node.children, key, children),
      };
    }
    return node;
  });
};

export default () => {

  const [tabsState, setTabsState] = useSetState<{
    activeKey: string
    panes: { filePath: string, title: string, needSave?: boolean }[]
  }>({
    activeKey: '',
    panes: []
  });
  const terminalRef = useRef<HTMLDivElement | null>(null)
  const [fileTreeData, setFileTreeData] = useState<DataNode[]>([]);
  const ref = useRef<(HTMLElement | null)[]>([]);
  const [expandFileKeys, setExpandFileKeys] = useState<string[]>([]);
  const [fileSettingState, setFileSettingState] = useSetState<{
    visible: boolean
    value: string
    title: string
    type: string
    filePath: string
  }>({
    visible: false,
    value: '',
    title: '',
    type: ' ',
    filePath: '',
  });
  /**
   * 选择打开文件夹
   */
  const openDirectory = async (): Promise<void> => {
    const res = await dialog.showOpenDialog({
      title: '打开文件夹',
      properties: ['openDirectory']
    });
    if (res.cancel || !res.filePaths[0]) return;
    ipcRenderer.send('filePath', {filePath: res.filePaths[0]})
    setFileTreeData([{
      title: path.basename(res.filePaths[0].replace(/\\/g, '/')),
      key: res.filePaths[0].replace(/\\/g, '/'),
      isLeaf: false
    }]);
  };
  /**
   * 获取下级节点
   * @param node
   */
  const loadFileTree = async (node: DataNode): Promise<void> => {
    const {eventKey} = node.props;
    console.log('aaa');
    const res = fs.readdirSync(eventKey);
    const fileList = res.map((item: string) => {
      const filePath = `${eventKey}/${item}`;
      const fileStat = fs.statSync(filePath);
      if (!fileStat.isFile() && !fileStat.isDirectory()) return undefined;
      return {
        title: item,
        key: filePath,
        isLeaf: fileStat.isFile()
      };
    });
    const fileListSort = _.sortBy(fileList.filter((item?: DataNode) => !!item), ['isLeaf', 'title']);
    setFileTreeData(origin =>
      updateTreeData(origin, eventKey as string, fileListSort as DataNode[]));
  };
  /**
   * 打开或选择文件
   * @param selectedKeys
   * @param e
   */
  const openOrSelectFile = (selectedKeys: string[], e: AntTreeNodeSelectedEvent) => {
    if (!e.node.props.isLeaf) return;
    const findPane = _.find(tabsState.panes, {filePath: e.node.props.eventKey});
    if (!findPane) {
      setTabsState({
        panes: [...tabsState.panes, {
          filePath: e.node.props.eventKey as string,
          title: e.node.props.title as string
        }],
        activeKey: e.node.props.eventKey
      });
      return;
    }
    setTabsState({
      activeKey: e.node.props.eventKey
    });
  };

  /**
   * 删除tabs
   * @param targetKey
   * @param index
   */
  const removeTabs = (targetKey: string | React.MouseEvent<HTMLElement>, index: number) => {
    if (tabsState.panes.length === 1) {
      setTabsState({
        activeKey: '',
        panes: []
      });
      return;
    }
    if (tabsState.activeKey === targetKey) {
      if (index === 0) {
        setTabsState({
          activeKey: tabsState.panes[index + 1].filePath,
        });
      } else {
        setTabsState({
          activeKey: tabsState.panes[index - 1].filePath,
        });
      }
    }
    setTabsState({
      panes: _.remove(tabsState.panes, item => item.filePath !== targetKey)
    });
  };
  /**
   * tabs修改操作
   * @param targetKey
   * @param action
   */
  const editCodeTabs = (targetKey: string | React.MouseEvent<HTMLElement>, action: 'add' | 'remove') => {
    if (action !== 'remove') return;
    const index = _.findIndex(tabsState.panes, {filePath: targetKey as string});
    if (index < 0) return;
    const panes = tabsState.panes[index];
    if (!panes.needSave) return removeTabs(targetKey, index);
    // Modal.confirm({
    //   content: `${panes.title}还未保存，是否保存？`,
    //   okText: '保存',
    //   cancelText: '不保存',
    //   onCancel: () => {
    //     removeTabs(targetKey, index);
    //   },
    //   onOk: () => {
    //     removeTabs(targetKey, index);
    //   }
    // });

  };
  /**
   * 代码是否保存改变
   * @param needSave
   * @param filePath
   */
  const fileSaveChange = (needSave: boolean, filePath: string) => {
    const panes = _.cloneDeep(tabsState.panes);
    const fileIndex = _.findIndex(panes, {filePath});
    if (fileIndex < 0) return;
    panes[fileIndex].needSave = needSave;
    setTabsState({
      panes
    });
  };
  /**
   * 文件右键菜单
   * @param node
   */
  const fileMenu = (node: DataNode): React.ReactElement => <Menu>
    <Menu.Item>添加文件</Menu.Item>
    <Menu.Item>添加文件夹</Menu.Item>
    <Menu.Item
      onClick={() => setFileSettingState({
        title: '重命名',
        filePath: node.key,
        value: node.title,
        visible: true,
        type: 'rename'
      })}>重命名</Menu.Item>
    <Menu.Item>删除</Menu.Item>
  </Menu>;
  /**
   * 文件操作确认事件
   */
  const fileSettingConfirm = {
    // 重命名
    rename: () => {
      try {
        const fileIsExist = fs.existsSync(fileSettingState.filePath);
        if (!fileIsExist) return;
        const filePathDir = _.trimEnd(fileSettingState.filePath, path.basename(fileSettingState.filePath));
        fs.renameSync(fileSettingState.filePath, `${filePathDir}${fileSettingState.value}`);
      } catch (e) {
        console.error(e);
      }
    }
  };
  /**
   * 初始化终端
   */
  const initTerminal = () => {
    if (!terminalRef.current) return
    console.log('aaa')
    const term = new Terminal({
      rendererType: 'canvas',
      cursorBlink: true, // 光标闪烁
      cols: 80,
      rows: 34,
      theme: {
        background: "#002833", // 背景色
        lineHeight: 16
      }
    })
    term.open(terminalRef.current as HTMLElement)
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();
    term.onData(data => {
      ipcRenderer.send('terminalData', {
        data
      })
    })
    ipcRenderer.on('ptyData', (event, data) => {
      term.write(data)
    })
  }

  useUpdateEffect(() => {
    if (fileTreeData.length > 0) {
      initTerminal()
    }
  }, [fileTreeData])

  useMount(() => {
    if (!ref.current) return;
  });

  return (
    <div className="page-home" ref={ref}>
      <div className="file-tree">
        <div className="file-tree-title"><CodeOutlined/>文件目录</div>
        <div className="file-tree-content">
          <DirectoryTree
            treeData={fileTreeData}
            loadedKeys={expandFileKeys}
            onLoad={(expandKeys)=> setExpandFileKeys(expandKeys)}
            loadData={loadFileTree}
            titleRender={node => <Dropdown overlay={fileMenu(node)} trigger={['contextMenu']}><span>{node.title}</span></Dropdown>}
            onRightClick={options => {
              options.event.persist();
            }}
            selectedKeys={[tabsState.activeKey]}
            onSelect={openOrSelectFile}
          />
        </div>
      </div>
      {
        fileTreeData.length === 0 && <div className="empty-content">
          <Button onClick={openDirectory}>打开文件夹</Button>
        </div>
      }
      {
        fileTreeData.length > 0 && <div className="main-content">
          <Tabs
            className="tabs"
            type="editable-card"
            hideAdd
            onChange={activeKey => setTabsState({activeKey})}
            onEdit={editCodeTabs}
            activeKey={tabsState.activeKey}
          >
            {
              tabsState.panes.map((item, index) =>
                <TabPane
                  tab={<Tooltip title={item.filePath} placement="top">{item.title}
                    {
                      item.needSave &&
                      <span style={{color: 'red'}}>*</span>
                    }
                  </Tooltip>}
                  key={item.filePath}>
                  <CodeTabContent
                    onSaveChange={fileSaveChange} filePath={item.filePath}/>
                </TabPane>)
            }
          </Tabs>
          <div className="main-terminal" ref={terminalRef}>

          </div>
        </div>
      }
      {/* 重命名 */}
      <Modal
        visible={fileSettingState.visible}
        title={fileSettingState.title}
        okText="确认"
        onOk={fileSettingConfirm[fileSettingState.type]}
        onCancel={() => setFileSettingState({visible: false})}
        cancelText="取消"
      >
        <Input
          value={fileSettingState.value}
          onChange={event => setFileSettingState({value: event.target.value})}
        />
      </Modal>
    </div>
  );
}
