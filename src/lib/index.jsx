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
    this.state.dropDownVisible = true
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
        })(ans)
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
        })(ans)
      default:
        return ans
    }
  }

  setNodeStatus (node, checked) {
    const setChildStatus = (node) => {
      if (Array.isArray(node.children)) {
        node.children.forEach(child => setChildStatus(child))
      }
      node.checked = checked
      node.indeterminate = false
    }
    const setParentStatus = (node) => {
      let current = node
      while (current.parent) {
        const indeterminate = !current.parent.children.every(sibling => sibling.checked === checked && !sibling.indeterminate)
        current.parent.checked = indeterminate ? false : checked
        current.parent.indeterminate = indeterminate
        current = current.parent
      }
    }

    node.checked = checked
    setChildStatus(node)
    setParentStatus(node)
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
          treeData.map((node) => (
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
    level.slice(...searchRange).forEach(level => level.forEach(child => {
      const hit = filterTreeNode(keyword, child)
      child.hit = hit
      if (hit) {
        let current = child
        while (current.parent) {
          current.parent.hit = true
          current = current.parent
        }
      }
    }))
    this.setState({
      treeData
    })
  }

  toggleDropDownVisible (visible) {
    this.setState({
      dropDownVisible: visible
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
    treeData.forEach(child => { child.hit = true })
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
      searchPlaceholder
    } = this.props
    const tree = this.generateTree(treeData)
    console.log('tree select render')
    return (
      <div
        className='tree-select'
        ref={el => { this.rootRef = el }}
        onClick={() => { this.toggleDropDownVisible(true) }}
      >
        <div
          className='tree-value'
          tabIndex={-1}
        >
          <div className='tags'>
            {
              value.map(el => <Tag closable key={el.key} onClose={() => this.removeNode(el)}>{ el.title }</Tag>)
            }
          </div>
          {allowClear && <Icon type='close-circle' theme='filled' className='clear' onClick={() => this.clearValue()} />}
        </div>
        {
          dropDownVisible &&
          <div className='drop-down'>
            <Input
              className='search'
              placeholder={searchPlaceholder}
              onPressEnter={(e) => this.filterTreeNode(e.target.value)}
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
  searchPlaceholder: PropTypes.string,
  showCheckedStrategy: PropTypes.string,
  treeData: PropTypes.array,
  value: PropTypes.array,
  searchRange: PropTypes.array,
  onChange: PropTypes.func,
  filterTreeNode: PropTypes.func
}

ReactTreeSelect.defaultProps = {
  allowClear: false,
  searchPlaceholder: 'Press Enter to search',
  showCheckedStrategy: 'SHOW_CHILD',
  treeData: [],
  value: [],
  searchRange: [],
  onChange: () => {},
  filterTreeNode: (inputValue, treeNode) => treeNode.value.includes(inputValue)
}

export default ReactTreeSelect
