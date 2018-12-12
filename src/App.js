import React, { Component } from 'react'

import ReactTreeSelect from './lib'
import logo from './logo.svg'
import './App.css'
import data from './example/data.json'

class App extends Component {
  filterTreeNode (inputValue, treeNode) {
    // console.log(treeNode)
    return treeNode.title.includes(inputValue)
    // return !treeNode.props.title.includes('->') && treeNode.props.title.includes(inputValue) && Array.isArray(treeNode.props.children)
  }

  onChange (value, label, extra) {
    console.log(value, label, extra)
  }

  render () {
    const tProps = {
      treeData: data,
      allowClear: true,
      treeCheckable: true,
      searchRange: [],
      filterTreeNode: this.filterTreeNode,
      onChange: this.onChange,
      showCheckedStrategy: 'SHOW_PARENT',
      searchPlaceholder: '按 Enter 键进行搜索',
      style: {
        width: 300
      }
    }

    return (
      <div className='App'>
        <header className='App-header'>
          <img src={logo} className='App-logo' alt='logo' />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className='App-link'
            href='https://reactjs.org'
            target='_blank'
            rel='noopener noreferrer'
          >
            Learn React
          </a>
          <ReactTreeSelect {...tProps} />
        </header>
      </div>
    )
  }
}

export default App
