import React from 'react'
import PropTypes from 'prop-types'
import { Icon } from 'antd'

import './style.css'

const Tag = ({
  children,
  closable,
  color,
  onClose
}) => (
  <span className='tag' style={{ backgroundColor: color }}>
    {children}
    {closable && <Icon type='close' className='close' onClick={(e) => onClose(e)} />}
  </span>
)

Tag.propTypes = {
  closable: PropTypes.bool,
  color: PropTypes.string,
  onClose: PropTypes.func
}

Tag.defaultProps = {
  closable: false,
  color: '#f3f3f3',
  onClose: () => {}
}

export default Tag
