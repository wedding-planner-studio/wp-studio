import { Button } from './ui/button';

interface ManageSubscriptionButtonProps extends React.ComponentProps<'button'> {
  text: string;
}
// TODO: Add a button to manage the subscription
export const ManageSubscriptionButton = ({ text, className }: ManageSubscriptionButtonProps) => {
  return <Button className={className}>{text}</Button>;
};
