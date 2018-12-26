import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'antd'
import clone from './utils'
import Tag from './Tag.jsx'
import Input from './Input.jsx'
import Checkbox from './Checkbox.jsx'
import './style.css'
import 'antd/dist/antd.css'

class ReactTreeSelect extends Component {
  constructor (props) {
    super(props)
    this.state = clone({
      treeData: props.treeData,
      value: props.value
    })
    this.state.dropDownVisible = false
    this.state.level = []
    // value 与 treeData 引用相同的 Object
    this.state.treeData = this.state.treeData.map((node) => {
      const patchAttr = (node, parent = null, deep = 0) => {
        node.parent = parent
        node.hit = true
        node.expand = false
        node.checked = false
        node.indeterminate = false
        if (this.state.level[deep]) this.state.level[deep].push(node)
        else this.state.level[deep] = [node]
        if (Array.isArray(node.children)) {
          node.children.forEach(child => patchAttr(child, node, deep + 1))
        }
        return node
      }
      return patchAttr(node)
    })
    this.state.value = this.getValue(this.state.treeData, this.state.value)
  }

  componentDidMount () {
    this.state.value.forEach(node => {
      this.setNodeStatus(node, true)
    })
    document.addEventListener('click', (e) => {
      const clickRoot = e.path
        .filter(dom => dom instanceof window.Node)
        .some(dom => this.rootRef.contains(dom))
      if (!clickRoot) {
        this.toggleDropDownVisible(false)
      }
    })
  }

  componentWillReceiveProps (nextProps) {
    const { value } = nextProps
    const nextValue = Array.isArray(value) ? value : [value]
    // To prevent cycle renderer
    const currValue = this.state.value.map(el => el.value)
    // reference https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
    const currMinusNext = currValue.filter(v => !nextValue.includes(v))
    const nextMinusCurr = nextValue.filter(v => !currValue.includes(v))
    // if (currMinusNext.length === 0 && nextMinusCurr.length === 0) {
    //   console.warn('may be exist cycle render in your component')
    // }
    this.getValue(this.state.treeData, currMinusNext).forEach((node) => {
      this.setNodeStatus(node, false)
    })
    this.getValue(this.state.treeData, nextMinusCurr).forEach((node) => {
      this.setNodeStatus(node, true)
    })
  }

  // bfs, 根据 value 反推 treeData 中 selected 的节点
  getValue (treeData, value) {
    const ans = []
    const queue = [...treeData]
    while (queue.length) {
      const top = queue.shift()
      if (value.includes(top.value)) ans.push(top)
      else if (Array.isArray(top.children)) queue.push(...top.children)
    }
    return ans
  }

  // bfs, 根据 treeData 推导 value 中 selected 的节点
  getSelectedNodeList (treeData, type) {
    const ans = []
    const queue = [...treeData]
    while (queue.length) {
      const top = queue.shift()
      if (top.indeterminate || top.checked) {
        if (!top.indeterminate) ans.push(top)
        else if (Array.isArray(top.children)) queue.push(...top.children)
      }
    }
    switch (type) {
      case 'SHOW_CHILD':
        // flat
        return (function getChild (nodeList) {
          return nodeList.reduce(
            (acc, cur) =>
              Array.isArray(cur.children)
                ? [...acc, ...getChild(cur.children)]
                : [...acc, cur]
            , [])
        }(ans))
      case 'SHOW_PARENT':
        return ans
      case 'SHOW_ALL':
        // flat
        return (function getAll (nodeList) {
          return nodeList.reduce(
            (acc, cur) =>
              Array.isArray(cur.children)
                ? [...acc, cur, ...getAll(cur.children)]
                : [...acc, cur]
            , [])
        }(ans))
      default:
        return ans
    }
  }

  setNodeStatus (node, checked) {
    // sync child node status
    const setChildChecked = (node, checked) => {
      if (Array.isArray(node.children)) {
        node.children.forEach(child => setChildChecked(child, checked))
      }
      node.checked = checked
      node.indeterminate = false
    }
    /**
     * @param {Object} node 节点
     * @description 递归向上设置父节点的选中状态，并进行相关操作（根节点选中后移除 value 中的子节点）
     * 当前节点变更
     * ├── 未选 -> 已选
     * │   ├── 父节点半选 -> 半选, value.add(child)
     * │   ├── 父节点未选 -> 半选, value.add(child)
     * │   ├── 父节点未选 -> 已选, value.add(parent), value.remove(children)
     * │   └── 父节点半选 -> 已选, value.add(parent), value.remove(children)
     * └── 已选 -> 未选
     *     ├── 父节点半选 -> 半选, value.remove(children)
     *     ├── 父节点半选 -> 未选, value.remove(children)
     *     ├── 父节点已选 -> 未选, value.remove(children), value.remove(parent)
     *     └── 父节点已选 -> 半选, value.remove(children), value.remove(parent)
     * ----- 分割线 -----
     * 节点变更后不及时对 value 进行操作，改由搜索获取
     */
    const setParentChecked = (node, checked) => {
      let current = node
      while (current.parent) {
        const indeterminate = !current.parent.children.every(sibling => sibling.checked === checked && !sibling.indeterminate)

        current.parent.checked = indeterminate ? false : checked
        current.parent.indeterminate = indeterminate

        current = current.parent
      }
    }

    node.checked = checked
    setChildChecked(node, checked)
    setParentChecked(node, checked)
    const { treeData } = this.state
    const { onChange, showCheckedStrategy } = this.props
    const value = this.getSelectedNodeList(treeData, showCheckedStrategy)
    onChange(value.map(node => node.value), value.map(node => node.title))
    this.setState({
      value,
      treeData
    })
  }

  generateTree (treeData) {
    return (
      <ul>
        {
          treeData.map(node => (
            node.hit && <li key={node.key}>
              {
                Array.isArray(node.children)
                  ? node.expand
                    ? <Icon type='caret-down' onClick={() => this.toggleExpand(node, !node.expand)} />
                    : <Icon type='caret-right' onClick={() => this.toggleExpand(node, !node.expand)} />
                  : null
              }
              <Checkbox
                checked={node.checked}
                indeterminate={node.indeterminate}
                onChange={() => this.setNodeStatus(node, !node.checked)}
              >
                {node.title}
              </Checkbox>
              {Array.isArray(node.children) && node.expand && this.generateTree(node.children) }
            </li>
          ))
        }
      </ul>
    )
  }

  removeNode (target) {
    this.setNodeStatus(target, false)
    const { value } = this.state
    this.setState({
      value: value.filter(node => node.value !== target.value)
    })
  }

  filterTreeNode (keyword) {
    if (!keyword) {
      this.clearSearch()
      return
    }
    const { treeData, level } = this.state
    const { filterTreeNode, searchRange } = this.props
    const setChildHit = (node, hit) => {
      if (Array.isArray(node.children)) {
        node.children.forEach(child => setChildHit(child));
      }
      node.hit = hit
    }
    const setParentHit = (node, hit) => {
      let current = node
      while (current.parent) {
        current.parent.hit = hit
        current = current.parent
      }
    }
    level.slice(...searchRange).forEach(level => level.forEach(child => {
      const hit = filterTreeNode(keyword, child)
      child.hit = hit
      if (hit) {
        setChildHit(child, true)
        setParentHit(child, true)
      }
    }))
    this.setState({
      treeData
    })
  }

  toggleDropDownVisible (visible) {
    this.setState({
      dropDownVisible: visible
    }, () => {
      if (this.state.dropDownVisible) {
        this.searchRef.focus()
      }
    })
  }

  toggleExpand (node, expand) {
    node.expand = expand
    const { treeData } = this.state
    this.setState({
      treeData
    })
  }

  clearValue () {
    const { value, treeData } = this.state
    value.forEach(node => {
      this.setNodeStatus(node, false)
    })
    this.setState({
      value: [],
      treeData
    })
  }

  clearSearch () {
    const { treeData, level } = this.state
    const { searchRange } = this.props
    level.slice(...searchRange).forEach(level => level.forEach((child) => { child.hit = true }))
    this.setState({
      treeData
    })
  }

  render () {
    const {
      dropDownVisible,
      value,
      treeData
    } = this.state
    const {
      allowClear,
      placeholder,
      searchPlaceholder,
      style: customStyle,
      dropDownStyle
    } = this.props
    const tree = this.generateTree(treeData)
    return (
      <div
        className='tree-select'
        ref={el => { this.rootRef = el }}
        onClick={() => { this.toggleDropDownVisible(true) }}
        style={customStyle}
      >
        <div
          className='tree-value'
          tabIndex={-1}
        >
          <div className='tags' placeholder={placeholder}>
            {
              value.map(el => <Tag closable key={el.key} onClose={() => this.removeNode(el)}>{ el.title }</Tag>)
            }
          </div>
          {allowClear && <Icon type='close-circle' className='clear' onClick={() => this.clearValue()} />}
        </div>
        {
          dropDownVisible &&
          <div className='drop-down' style={dropDownStyle}>
            <Input
              className='search'
              placeholder={searchPlaceholder}
              onChange={e => this.filterTreeNode(e.target.value)}
              onPressEnter={e => this.filterTreeNode(e.target.value)}
              ref={(el) => { this.searchRef = el }}
            />
            {
              tree
            }
          </div>
        }
      </div>
    )
  }
}

ReactTreeSelect.propTypes = {
  allowClear: PropTypes.bool,
  placeholder: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  showCheckedStrategy: PropTypes.string,
  dropDownStyle: PropTypes.object,
  style: PropTypes.object,
  treeData: PropTypes.array,
  value: PropTypes.array,
  searchRange: PropTypes.array,
  onChange: PropTypes.func,
  filterTreeNode: PropTypes.func
}

ReactTreeSelect.defaultProps = {
  allowClear: false,
  placeholder: 'focus to select',
  searchPlaceholder: 'Press Enter to search',
  showCheckedStrategy: 'SHOW_CHILD',
  style: {},
  treeData: [],
  value: [],
  searchRange: [],
  onChange: () => {},
  filterTreeNode: (inputValue, treeNode) => treeNode.value.includes(inputValue)
}

export default ReactTreeSelect
