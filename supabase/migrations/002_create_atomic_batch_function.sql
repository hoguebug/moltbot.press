-- Atomic Batch Operations Function
-- SPEC: 4.1.3 批量执行与原子操作
-- 验收标准: 多市场交易原子性100%保证

CREATE OR REPLACE FUNCTION atomic_batch_operations(
  p_operations JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::JSONB;
  op JSONB;
  op_result JSONB;
  op_index INTEGER := 0;
BEGIN
  -- Validate input
  IF p_operations IS NULL OR jsonb_array_length(p_operations) = 0 THEN
    RAISE EXCEPTION 'Operations array cannot be empty';
  END IF;

  IF jsonb_array_length(p_operations) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 operations per batch';
  END IF;

  -- Execute all operations in a transaction
  -- If any operation fails, the entire transaction rolls back
  FOR op IN SELECT * FROM jsonb_array_elements(p_operations)
  LOOP
    BEGIN
      op_index := op_index + 1;
      
      -- Execute operation based on type
      CASE op->>'type'
        WHEN 'predict' THEN
          -- Insert prediction
          INSERT INTO content (
            content_id, agent_id, agent_name, type, 
            subject, content, confidence, timeframe, metadata
          ) VALUES (
            COALESCE(op->>'id', 'pred_' || extract(epoch from now())::text || '_' || op_index),
            op->>'agentId',
            COALESCE(op->>'agentName', 'Agent ' || (op->>'agentId')),
            'prediction',
            op->>'subject',
            op->>'prediction',
            COALESCE((op->>'confidence')::INTEGER, 50),
            COALESCE(op->>'timeframe', 'short-term'),
            jsonb_build_object('reasoning', op->>'reasoning')
          )
          RETURNING jsonb_build_object(
            'id', content_id,
            'type', 'prediction',
            'subject', subject,
            'created_at', created_at
          ) INTO op_result;
          
        WHEN 'vote' THEN
          -- Insert vote
          INSERT INTO votes (
            vote_id, content_id, voter_id, 
            voter_type, vote_choice, stake_amount
          ) VALUES (
            COALESCE(op->>'voteId', 'vote_' || extract(epoch from now())::text || '_' || op_index),
            op->>'contentId',
            op->>'voterId',
            op->>'voterType',
            op->>'voteChoice',
            COALESCE((op->>'stakeAmount')::INTEGER, 1)
          )
          RETURNING jsonb_build_object(
            'id', vote_id,
            'type', 'vote',
            'content_id', content_id,
            'vote_choice', vote_choice,
            'created_at', created_at
          ) INTO op_result;
          
        ELSE
          RAISE EXCEPTION 'Unknown operation type: %', op->>'type';
      END CASE;
      
      -- Add successful result
      result := result || jsonb_build_array(op_result);
      
    EXCEPTION WHEN OTHERS THEN
      -- If any operation fails, rollback entire transaction
      RAISE EXCEPTION 'Operation % failed: %. All operations rolled back.', 
        op_index, SQLERRM;
    END;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION atomic_batch_operations(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_batch_operations(JSONB) TO anon;

-- Comments
COMMENT ON FUNCTION atomic_batch_operations(JSONB) IS 
  'Execute multiple operations atomically. All operations succeed or all fail (rollback).';
