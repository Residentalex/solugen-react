import { Select as AntSelect } from 'antd';
import type { SelectProps } from 'antd';
import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';

const SELECT_LIST_HEIGHT = 170;

function SelectImpl<ValueType, OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType>(
  props: SelectProps<ValueType, OptionType>
) {
  const { listHeight = SELECT_LIST_HEIGHT, ...rest } = props;
  return <AntSelect<ValueType, OptionType> listHeight={listHeight} {...rest} />;
}

SelectImpl.Option = AntSelect.Option;
SelectImpl.OptGroup = AntSelect.OptGroup;

export { SelectImpl as Select };
